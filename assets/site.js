"use strict";

const $ = (id) => document.getElementById(id);
const base = new URL("./", document.baseURI);
const state = { documents: [], selected: new Set(), busy: false };

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
function fileURL(path) {
  if (!/^(resume\.pdf|files\/[A-Za-z0-9._-]+\.pdf|application\.zip)$/.test(path)) {
    throw new Error("올바르지 않은 문서 경로입니다.");
  }
  return new URL(path, base).href;
}
function setStatus(message, error = false) {
  $("status").textContent = message;
  $("status").classList.toggle("error", error);
}
function refreshSelection() {
  const count = state.selected.size;
  $("selected-count").textContent = count + "개 선택";
  $("download-selected").disabled = count === 0 || state.busy;
  $("select-all").disabled = state.busy;
  $("clear-selection").disabled = state.busy;
  document.querySelectorAll(".document-card input[type=checkbox]").forEach((input) => {
    input.disabled = state.busy;
    input.checked = state.selected.has(input.value);
  });
}
function element(tag, cls, content) {
  const item = document.createElement(tag);
  if (cls) item.className = cls;
  if (content !== undefined) item.textContent = content;
  return item;
}
function renderDocuments() {
  const list = $("document-list");
  list.replaceChildren();
  for (const doc of state.documents) {
    const card = element("article", "document-card");
    const input = element("input");
    input.type = "checkbox";
    input.id = "doc-" + doc.id;
    input.value = doc.id;
    input.checked = true;
    input.addEventListener("change", () => {
      if (input.checked) state.selected.add(doc.id);
      else state.selected.delete(doc.id);
      refreshSelection();
    });
    const info = element("div", "document-info");
    const label = element("label", "", doc.title);
    label.htmlFor = input.id;
    const description = element("p", "", doc.description || "PDF 문서");
    const meta = element("small", "", formatSize(doc.size_bytes));
    info.append(label, description, meta);

    const actions = element("div", "document-actions");
    const preview = element("a", "", "미리보기");
    preview.href = fileURL(doc.path);
    preview.target = "_blank";
    preview.rel = "noopener noreferrer";
    preview.setAttribute("aria-label", doc.title + " 미리보기");
    const download = element("a", "", "PDF 다운로드");
    download.href = fileURL(doc.path);
    download.download = doc.path.split("/").pop();
    download.setAttribute("aria-label", doc.title + " PDF 다운로드");
    actions.append(preview, download);
    card.append(input, info, actions);
    list.append(card);
  }
  state.selected = new Set(state.documents.map((doc) => doc.id));
  refreshSelection();
}
function crc32(data) {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let b = 0; b < 8; b++) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function generateZip(files) {
  if (!files.length || files.length > 65535) throw new Error("ZIP 문서 수가 올바르지 않습니다.");
  const encoder = new TextEncoder();
  const chunks = [];
  const central = [];
  let offset = 0;
  for (const file of files) {
    const name = encoder.encode(file.name);
    const data = file.bytes;
    if (data.length > 0xffffffff || offset > 0xffffffff || name.length > 65535) {
      throw new Error("ZIP 크기 제한을 초과했습니다.");
    }
    const checksum = crc32(data);
    const header = new Uint8Array(30 + name.length);
    const local = new DataView(header.buffer);
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // UTF-8 filenames
    local.setUint16(8, 0, true); // store: PDFs are already compressed
    local.setUint16(10, 0, true);
    local.setUint16(12, 33, true); // 1980-01-01
    local.setUint32(14, checksum, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, name.length, true);
    header.set(name, 30);
    chunks.push(header, data);

    const record = new Uint8Array(46 + name.length);
    const dir = new DataView(record.buffer);
    dir.setUint32(0, 0x02014b50, true);
    dir.setUint16(4, 20, true);
    dir.setUint16(6, 20, true);
    dir.setUint16(8, 0x0800, true);
    dir.setUint16(10, 0, true);
    dir.setUint16(12, 0, true);
    dir.setUint16(14, 33, true);
    dir.setUint32(16, checksum, true);
    dir.setUint32(20, data.length, true);
    dir.setUint32(24, data.length, true);
    dir.setUint16(28, name.length, true);
    dir.setUint32(42, offset, true);
    record.set(name, 46);
    central.push(record);
    offset += header.length + data.length;
  }
  const centralSize = central.reduce((sum, item) => sum + item.length, 0);
  if (offset + centralSize > 0xffffffff) throw new Error("ZIP 크기 제한을 초과했습니다.");
  const end = new Uint8Array(22);
  const view = new DataView(end.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(8, files.length, true);
  view.setUint16(10, files.length, true);
  view.setUint32(12, centralSize, true);
  view.setUint32(16, offset, true);
  return new Blob([...chunks, ...central, end], { type: "application/zip" });
}
async function readVerifiedDocument(doc) {
  const response = await fetch(fileURL(doc.path), { cache: "no-store" });
  if (!response.ok) throw new Error(doc.title + " 파일을 가져올 수 없습니다.");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length !== doc.size_bytes || bytes[0] !== 37 || bytes[1] !== 80 ||
      bytes[2] !== 68 || bytes[3] !== 70 || bytes[4] !== 45) {
    throw new Error(doc.title + " 파일의 크기 또는 형식이 올바르지 않습니다.");
  }
  if (globalThis.crypto && crypto.subtle) {
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
    const hex = Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
    if (hex !== doc.sha256) throw new Error(doc.title + " 무결성 검증에 실패했습니다. 새로고침 후 다시 시도하세요.");
  }
  return { name: doc.path, bytes };
}
async function downloadSelected() {
  const selected = state.documents.filter((doc) => state.selected.has(doc.id));
  if (!selected.length || state.busy) return;
  state.busy = true;
  refreshSelection();
  setStatus("선택한 문서를 확인하고 ZIP을 생성하는 중입니다.");
  try {
    const files = await Promise.all(selected.map(readVerifiedDocument));
    const blob = generateZip(files);
    const objectURL = URL.createObjectURL(blob);
    const link = element("a");
    link.href = objectURL;
    link.download = "selected-documents.zip";
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectURL), 60000);
    setStatus(selected.length + "개 문서를 ZIP으로 생성했습니다.");
  } catch (error) {
    console.error(error);
    setStatus(error.message || "다운로드에 실패했습니다.", true);
  } finally {
    state.busy = false;
    refreshSelection();
  }
}
async function initialize() {
  $("year").textContent = new Date().getFullYear();
  $("select-all").addEventListener("click", () => {
    state.selected = new Set(state.documents.map((doc) => doc.id));
    refreshSelection();
  });
  $("clear-selection").addEventListener("click", () => {
    state.selected.clear();
    refreshSelection();
  });
  $("download-selected").addEventListener("click", downloadSelected);
  try {
    const response = await fetch(new URL("manifest.json", base), { cache: "no-store" });
    if (!response.ok) throw new Error("첫 문서 배포를 준비 중입니다. 이후 다시 접속해 주세요.");
    const manifest = await response.json();
    if (manifest.schema_version !== 1 || !Array.isArray(manifest.documents) ||
        !manifest.documents.length || manifest.bundle?.path !== "application.zip") {
      throw new Error("문서 목록 형식이 올바르지 않습니다.");
    }
    for (const doc of manifest.documents) {
      fileURL(doc.path);
      if (typeof doc.id !== "string" || typeof doc.title !== "string" ||
          !Number.isSafeInteger(doc.size_bytes) || doc.size_bytes < 1 ||
          !/^[a-f0-9]{64}$/.test(doc.sha256)) {
        throw new Error("문서 목록 데이터가 올바르지 않습니다.");
      }
    }
    state.documents = manifest.documents;
    renderDocuments();
    const date = new Date(manifest.updated_at);
    $("updated-at").textContent = Number.isNaN(date.getTime()) ?
      "최근 배포됨" : "업데이트: " + new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeZone: "Asia/Seoul" }).format(date);
    $("document-total").textContent = "PDF " + state.documents.length + "개";
    const all = $("download-all");
    all.href = fileURL(manifest.bundle.path);
    all.classList.remove("disabled");
    all.removeAttribute("aria-disabled");
    all.removeAttribute("tabindex");
    setStatus("");
  } catch (error) {
    console.error(error);
    setStatus(error.message || "문서 목록을 불러오지 못했습니다.", true);
    $("updated-at").textContent = "배포 준비 중";
    $("document-total").textContent = "목록을 확인할 수 없음";
  }
}
initialize();
