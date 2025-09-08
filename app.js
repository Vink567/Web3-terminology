// 数据源：可按需继续扩展
let TERMS = [
  { term: "Address", desc: "地址。区块链上账户的公开标识，通常由公钥派生。" },
  { term: "Airdrop", desc: "空投。向用户分发代币的方式，常用于增长或治理分配。" },
  { term: "AMM", desc: "自动做市商。基于公式的去中心化交易机制，如 x*y=k。" },
  { term: "Bridge", desc: "跨链桥。跨链转移资产或消息的基础设施。" },
  { term: "Consensus", desc: "共识。网络参与者就区块顺序与状态达成一致的机制。" },
  { term: "DAO", desc: "去中心化自治组织。通过代币治理和智能合约运行的组织。" },
  { term: "DApp", desc: "去中心化应用。基于区块链的应用程序，通常由智能合约驱动。" },
  { term: "DeFi", desc: "去中心化金融。构建在区块链上的金融协议生态。" },
  { term: "EIP", desc: "以太坊改进提案。描述以太坊协议标准或流程的文档。" },
  { term: "EVM", desc: "以太坊虚拟机。执行智能合约的运行时环境。" },
  { term: "Gas", desc: "用于支付交易或执行合约的费用度量单位。" },
  { term: "Governance Token", desc: "治理代币。用于协议参数投票与治理的代币。" },
  { term: "Layer 1", desc: "第一层。基础区块链网络，如以太坊、比特币。" },
  { term: "Layer 2", desc: "第二层。扩容方案，在 L1 之外处理交易后再结算。" },
  { term: "MEV", desc: "最大可提取价值。块生产者通过交易排序可提取的价值。" },
  { term: "NFT", desc: "非同质化代币。表示独特数字资产的加密代币。" },
  { term: "Oracle", desc: "预言机。为链上合约提供链下数据的系统。" },
  { term: "Optimistic Rollup", desc: "乐观汇总。基于欺诈证明的 L2 扩容方案。" },
  { term: "Private Key", desc: "私钥。用于签名交易的机密密钥，必须妥善保管。" },
  { term: "Public Key", desc: "公钥。由私钥生成，可用于验证签名。" },
  { term: "Rollup", desc: "汇总。将多笔交易打包后提交到 L1 的扩容技术。" },
  { term: "Seed Phrase", desc: "助记词。恢复钱包的单词序列，需离线安全保存。" },
  { term: "Sidechain", desc: "侧链。与主链联动的独立区块链，常用于扩容或特化。" },
  { term: "Smart Contract", desc: "智能合约。部署在链上、可自动执行的程序。" },
  { term: "Stablecoin", desc: "稳定币。锚定法币或资产、价格相对稳定的代币。" },
  { term: "Staking", desc: "质押。锁定代币参与网络安全并获得收益。" },
  { term: "Slashing", desc: "惩罚。作恶或离线导致的质押削减机制。" },
  { term: "Tokenomics", desc: "代币经济学。代币发行、分配、通胀、价值捕获等设计。" },
  { term: "Utility Token", desc: "功能型代币。用于支付、使用权限或服务访问的代币。" },
  { term: "zkRollup", desc: "零知识汇总。基于有效性证明（ZKP）的 L2 扩容方案。" },
];

// 运行时基础数据源（默认使用内置 TERMS，加载 public/terms.json 成功后覆盖）
let BASE_TERMS = TERMS;

const A_TO_Z = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

// 与后台工具一致的本地存储键，用于跨页同步自定义术语
const STORAGE_KEY = 'web3_terms_custom';

function updateControlsHeight() {
  const controls = document.querySelector('.controls');
  if (!controls) return;
  const height = Math.ceil(controls.getBoundingClientRect().height);
  document.documentElement.style.setProperty('--controls-height', height + 'px');
}

function toPlain(str) {
  return (str || "").toLowerCase();
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function groupTerms(terms) {
  const map = new Map();
  for (const letter of A_TO_Z) map.set(letter, []);
  for (const item of terms) {
    const first = (item.term.match(/[a-z]/i) || ["#"])[0].toUpperCase();
    const bucket = map.has(first) ? first : A_TO_Z.includes(first) ? first : A_TO_Z[0];
    map.get(bucket).push(item);
  }
  for (const [k, arr] of map) {
    arr.sort((a, b) => a.term.localeCompare(b.term));
  }
  return map;
}

function buildAlphaIndex(availableLetters) {
  const nav = document.getElementById("alphaIndex");
  nav.innerHTML = "";
  for (const letter of A_TO_Z) {
    const btn = document.createElement("button");
    btn.textContent = letter;
    if (!availableLetters.has(letter)) btn.disabled = true;
    btn.addEventListener("click", () => {
      const el = document.getElementById(`group-${letter}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    nav.appendChild(btn);
  }
  // 索引长度可能变化，更新粘性偏移
  updateControlsHeight();
}

function highlight(text, query) {
  if (!query) return text;
  const re = new RegExp(escapeRegex(query), "ig");
  return text.replace(re, (m) => `<mark>${m}</mark>`);
}

const EMPTY_TPL = {
  welcome: (
    `\n      <div class="empty-emoji">🔎</div>\n      <h2>可搜索查询结果</h2>\n      <p>输入术语或使用上方 A-Z 索引开始探索。</p>\n    `
  ),
  noresult: (
    `\n      <div class="empty-emoji">🔍</div>\n      <h2>没有找到匹配结果</h2>\n      <p>试试更通用的关键词，或检查拼写。</p>\n    `
  )
};

function render(groups, query = "") {
  const resultsEl = document.getElementById("results");
  const emptyState = document.getElementById("emptyState");
  resultsEl.innerHTML = "";

  let totalCount = 0;
  const availableLetters = new Set();

  for (const letter of A_TO_Z) {
    const list = groups.get(letter) || [];
    const filtered = query
      ? list.filter((i) => toPlain(i.term).includes(toPlain(query)) || toPlain(i.desc).includes(toPlain(query)))
      : list;
    if (filtered.length === 0) continue;
    availableLetters.add(letter);
    totalCount += filtered.length;

    const title = document.createElement("div");
    title.className = "group-title";
    title.id = `group-${letter}`;
    title.textContent = letter;
    resultsEl.appendChild(title);

    for (const item of filtered) {
      const card = document.createElement("article");
      card.className = "term";
      const name = document.createElement("div");
      name.className = "name";
      name.innerHTML = highlight(item.term, query);
      const desc = document.createElement("div");
      desc.className = "desc";
      desc.innerHTML = highlight(item.desc, query);
      card.appendChild(name);
      card.appendChild(desc);
      resultsEl.appendChild(card);
    }
  }

  buildAlphaIndex(availableLetters);
  // 空状态：无查询 -> 欢迎提示；有查询且无匹配 -> 无结果提示；其余隐藏
  if (!query) {
    emptyState.hidden = false;
    emptyState.style.display = 'grid';
    emptyState.innerHTML = EMPTY_TPL.welcome;
  } else if (query && totalCount === 0) {
    emptyState.hidden = false;
    emptyState.style.display = 'grid';
    emptyState.innerHTML = EMPTY_TPL.noresult;
  } else {
    emptyState.hidden = true;
    emptyState.style.display = 'none';
  }
  // 渲染完成后，计算控件高度，避免粘性标题遮挡
  updateControlsHeight();
}

// 简单双向数据流：原始分组 + 查询态渲染
let GROUPS = groupTerms(TERMS);

// 搜索交互：去抖、快捷键
const inputEl = document.getElementById("searchInput");
const clearBtn = document.getElementById("clearBtn");

function debounce(fn, wait = 200) {
  let t = null;
  return (...args) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

const onInput = debounce(() => render(GROUPS, inputEl.value.trim()), 180);
const onResize = debounce(() => {
  updateControlsHeight();
  reevaluateSticky();
}, 150);

inputEl.addEventListener("input", onInput);
clearBtn.addEventListener("click", () => {
  inputEl.value = "";
  render(GROUPS, "");
  inputEl.focus();
});

// JSON 解析工具（供预加载使用）
function normalizeTerms(json) {
  if (!Array.isArray(json)) return [];
  const cleaned = [];
  for (const item of json) {
    if (!item) continue;
    const term = String(item.term || item.name || '').trim();
    const desc = String(item.desc || item.description || '').trim();
    if (!term) continue;
    cleaned.push({ term, desc });
  }
  return cleaned;
}

// 从 public/terms.json 预加载基础词条（失败时回退到内置 TERMS）
async function loadBaseTermsFromJson() {
  try {
    const res = await fetch('public/terms.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('failed to fetch terms.json: ' + res.status);
    const json = await res.json();
    const arr = normalizeTerms(json);
    if (Array.isArray(arr) && arr.length) {
      BASE_TERMS = arr;
    }
  } catch (err) {
    // 忽略错误，继续使用内置 TERMS 作为回退
  }
}

// 读取本地自定义术语（由 terms-editor.html 写入）
function readCustomFromLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const json = JSON.parse(raw);
    return normalizeTerms(json);
  } catch {
    return [];
  }
}

// 合并术语列表：后者对前者进行覆盖/追加（以术语名小写去重）
function mergeTerms(baseList, overrideList) {
  const map = new Map();
  for (const item of baseList) {
    const key = toPlain(item.term);
    map.set(key, { term: item.term, desc: item.desc });
  }
  for (const item of overrideList) {
    const key = toPlain(item.term);
    map.set(key, { term: item.term, desc: item.desc });
  }
  return Array.from(map.values());
}

function getMergedTerms() {
  const custom = readCustomFromLocal();
  if (!custom.length) return BASE_TERMS;
  return mergeTerms(BASE_TERMS, custom);
}

function syncFromLocalAndRender() {
  const merged = getMergedTerms();
  GROUPS = groupTerms(merged);
  render(GROUPS, inputEl.value.trim());
}
// 注意：不再自动读取 terms.json，仅基于浏览器本地存储渲染

window.addEventListener('load', async () => {
  updateControlsHeight();
  reevaluateSticky();
  // 读取 public/terms.json 并与本地自定义术语合并后渲染
  await loadBaseTermsFromJson();
  syncFromLocalAndRender();
});
window.addEventListener('resize', onResize);

window.addEventListener("keydown", (e) => {
  if (e.key === "/" && document.activeElement !== inputEl) {
    e.preventDefault();
    inputEl.focus();
  } else if (e.key === "Escape") {
    inputEl.value = "";
    render(GROUPS, "");
  }
});

// 首次渲染
render(GROUPS, "");

// 基于滚动位置切换 fixed 与 sticky，保证长列表下也能可靠吸顶
let controlsInitialTop = null;
function measureControlsTop() {
  const controls = document.querySelector('.controls');
  if (!controls) return;
  const rect = controls.getBoundingClientRect();
  // 当前滚动位置下，元素距离文档顶部的绝对位置
  controlsInitialTop = rect.top + window.scrollY;
}

function reevaluateSticky() {
  const controls = document.querySelector('.controls');
  if (!controls) return;
  const height = Math.ceil(controls.getBoundingClientRect().height);
  document.documentElement.style.setProperty('--controls-height', height + 'px');
  if (controlsInitialTop == null) measureControlsTop();
  const shouldFix = window.scrollY >= controlsInitialTop;
  controls.classList.toggle('is-fixed', shouldFix);
  document.body.classList.toggle('has-fixed-controls', shouldFix);
}

window.addEventListener('scroll', () => {
  if (controlsInitialTop == null) measureControlsTop();
  reevaluateSticky();
}, { passive: true });

// 监听跨页面的本地存储变化（在 terms-editor.html 点击“保存到浏览器”后触发）
window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEY) {
    syncFromLocalAndRender();
  }
});


