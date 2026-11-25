/* =====================================================================
   Sistema de Gestão — Igreja Assembleia de Deus · Extensão de Oriximiná
   Dados na nuvem (Firebase Auth + Cloud Firestore).
   ===================================================================== */
import { initializeApp, deleteApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut,
  sendPasswordResetEmail, sendEmailVerification, updateProfile, setPersistence, browserLocalPersistence,
  browserSessionPersistence, reauthenticateWithCredential, EmailAuthProvider, updatePassword,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, getDoc, setDoc, updateDoc,
  collection, onSnapshot, writeBatch, query, orderBy, limit,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { FIREBASE_CONFIG } from './firebase-config.js';

const fbApp = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(fbApp);
auth.languageCode = 'pt-BR';
let fs;
try { fs = initializeFirestore(fbApp, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) }); }
catch (e) { fs = initializeFirestore(fbApp, {}); }

/* ---------- Dados padrão da igreja (editáveis em Administração) ---------- */
const IGREJA_PADRAO = {
  nome: 'Igreja Assembleia de Deus',
  extensao: 'Extensão de Oriximiná',
  desde: 2012,
  endereco: 'Tv. Ten-Cel. Josino Cardoso Monteiro',
  bairro: 'Planalto',
  cidade: 'Curuá',
  uf: 'PA',
  cep: '68210-000',
  telefone: '(93) 99139-2286',
  email: '',
  pastor: '',
  pastora: '',
};

/* ---------- Tipos de culto ---------- */
const TIPOS_CULTO = {
  ebd:         { nome: 'Escola Bíblica Dominical', curto: 'EBD',               cor: '#3b82f6', cor2: '#06b6d4', ic: 'book' },
  senhoras:    { nome: 'Culto das Senhoras',       curto: 'Senhoras',          cor: '#ec4899', cor2: '#a855f7', ic: 'heart' },
  senhores:    { nome: 'Culto de Senhores',        curto: 'Senhores',          cor: '#6366f1', cor2: '#3b82f6', ic: 'users' },
  celebracao:  { nome: 'Culto de Celebração',      curto: 'Celebração',        cor: '#f97316', cor2: '#f59e0b', ic: 'music' },
  ceia:        { nome: 'Culto de Ceia',            curto: 'Santa Ceia',        cor: '#e11d48', cor2: '#9333ea', ic: 'cup' },
  treinamento: { nome: 'Culto de Treinamento',     curto: 'Treinamento',       cor: '#8b5cf6', cor2: '#6366f1', ic: 'cap' },
  oracao:      { nome: 'Culto de Oração',          curto: 'Oração',            cor: '#10b981', cor2: '#06b6d4', ic: 'flame' },
  circulo:     { nome: 'Círculo de Oração',        curto: 'Círculo de Oração', cor: '#f59e0b', cor2: '#f97316', ic: 'sunrise' },
};

const TIPOS_ENTRADA = ['Dízimo', 'Oferta', 'Oferta Missionária', 'Voto', 'Campanha', 'Outros'];
const COR_ENTRADA = { 'Dízimo': '#8b5cf6', 'Oferta': '#06b6d4', 'Oferta Missionária': '#10b981', 'Voto': '#f59e0b', 'Campanha': '#ec4899', 'Outros': '#64748b' };
const FORMAS = ['Dinheiro', 'PIX', 'Cartão', 'Transferência'];
const COR_FORMA = { 'Dinheiro': '#10b981', 'PIX': '#06b6d4', 'Cartão': '#8b5cf6', 'Transferência': '#f59e0b' };
const CAT_DESPESA = ['Energia', 'Água', 'Aluguel', 'Manutenção', 'Limpeza', 'Material', 'Missões', 'Ação Social', 'Eventos', 'Ajuda de custo', 'Outros'];
const CARGOS = ['Membro', 'Congregado', 'Auxiliar', 'Diácono', 'Diaconisa', 'Presbítero', 'Evangelista', 'Missionário', 'Missionária', 'Pastor', 'Pastora'];
const ESTADO_CIVIL = ['', 'Solteiro(a)', 'Casado(a)', 'Viúvo(a)', 'Divorciado(a)', 'União estável'];
const OBREIROS = ['Pastor', 'Pastora', 'Presbítero', 'Evangelista', 'Diácono', 'Diaconisa', 'Missionário', 'Missionária'];
const DEPTOS = ['Senhoras', 'Senhores', 'Jovens', 'Adolescentes', 'Crianças'];
const COR_DEPTO = { Senhoras: '#ec4899', Senhores: '#6366f1', Jovens: '#06b6d4', Adolescentes: '#f59e0b', 'Crianças': '#10b981' };
const PALETA = ['#8b5cf6', '#06b6d4', '#ec4899', '#f97316', '#10b981', '#3b82f6', '#f59e0b', '#f43f5e', '#14b8a6', '#a855f7', '#6366f1'];
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const MESES_C = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const DIAS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const DIAS_C = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/* ---------- Perfis de acesso ---------- */
const PAPEIS = {
  admin:      { nome: 'Administrador',   cor: '#8b5cf6', desc: 'Acesso total, inclusive usuários e configurações.' },
  pastor:     { nome: 'Pastor / Pastora', cor: '#f97316', desc: 'Vê tudo, inclusive finanças; edita membros, eventos e cultos.' },
  tesoureiro: { nome: 'Tesoureiro(a)',   cor: '#10b981', desc: 'Dízimos, ofertas, despesas, relatórios e registro de cultos.' },
  secretario: { nome: 'Secretário(a)',   cor: '#06b6d4', desc: 'Membros, eventos e registro de cultos.' },
  leitor:     { nome: 'Membro (leitura)', cor: '#64748b', desc: 'Vê agenda, eventos, informações da igreja e o próprio perfil.' },
  pendente:   { nome: 'Aguardando aprovação', cor: '#f59e0b', desc: 'Conta criada, ainda sem acesso.' },
};
const ACESSO = {
  admin: '*',
  pastor: ['painel', 'cultos', 'financeiro', 'despesas', 'relatorios', 'membros', 'eventos', 'igreja', 'config'],
  tesoureiro: ['painel', 'cultos', 'financeiro', 'despesas', 'relatorios', 'eventos', 'igreja', 'config'],
  secretario: ['painel', 'cultos', 'membros', 'eventos', 'igreja', 'config'],
  leitor: ['painel', 'cultos', 'eventos', 'igreja', 'config'],
  pendente: [],
};
const EDITA = { admin: '*', pastor: ['membros', 'eventos', 'cultos'], tesoureiro: ['financeiro', 'despesas', 'cultos'], secretario: ['membros', 'eventos', 'cultos'], leitor: [], pendente: [] };

/* ---------- Ícones (traços no estilo Lucide) ---------- */
const ICONS = {
  home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  wallet: '<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>',
  receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8M12 17.5v-11"/>',
  chart: '<path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-3"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  sparkles: '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/><path d="M5 3v4M3 5h4M19 17v4M17 19h4"/>',
  church: '<path d="M18 22V10l-6-5-6 5v12"/><path d="M12 2v3M10.5 3.5h3"/><path d="M2 22h20"/><path d="M10 22v-4a2 2 0 0 1 4 0v4"/><path d="M6 13H3v9M18 13h3v9"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  sidebar: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>',
  chevrons: '<path d="m11 17-5-5 5-5M18 17l-5-5 5-5"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  msg: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  trendUp: '<path d="M22 7 13.5 15.5l-5-5L2 17"/><path d="M16 7h6v6"/>',
  trendDown: '<path d="M22 17 13.5 8.5l-5 5L2 7"/><path d="M16 17h6v-6"/>',
  edit: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  printer: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  cake: '<path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1M2 21h20M7 8v3M12 8v3M17 8v3M7 4h.01M12 4h.01M17 4h.01"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
  activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C9 3 11 5 12 8c1-3 3-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
  book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  cap: '<path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c3 3 9 3 12 0v-5M22 10v6"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  cup: '<path d="M8 22h8M12 15v7M7 2h10l-1 7a4 4 0 0 1-8 0Z"/>',
  sunrise: '<path d="M12 2v8M4.93 10.93l1.41 1.41M2 18h2M20 18h2M19.07 10.93l-1.41 1.41M22 22H2M8 6l4-4 4 4M16 18a4 4 0 0 0-8 0"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5M3 12a9 3 0 0 0 18 0"/>',
  map: '<path d="M14.1 6 9.9 3.9a2 2 0 0 0-1.8 0L3.6 6.2A1 1 0 0 0 3 7.1v12.3a1 1 0 0 0 1.4.9l3.7-1.9a2 2 0 0 1 1.8 0l4.2 2.1a2 2 0 0 0 1.8 0l4.5-2.3a1 1 0 0 0 .6-.9V5.1a1 1 0 0 0-1.4-.9l-3.7 1.9a2 2 0 0 1-1.8 0Z"/><path d="M9 4v15M15 6v15"/>',
  zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
};
const ic = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;

/* ---------- Utilitários ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const hoje = () => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); };
const fmtData = s => (s ? parse(s).toLocaleDateString('pt-BR') : '');
const fmtDM = s => (s ? `${pad(parse(s).getDate())}/${pad(parse(s).getMonth() + 1)}` : '');
const fmtDataHora = t => { const d = new Date(t); return isNaN(d) ? '' : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }); };
const brl = v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const brlCurto = v => { v = Number(v) || 0; const a = Math.abs(v); if (a >= 1e6) return 'R$ ' + (v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mi'; if (a >= 1e3) return 'R$ ' + (v / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil'; return 'R$ ' + Math.round(v); };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const soma = arr => arr.reduce((s, x) => s + (Number(x.valor) || 0), 0);
const prefixoMes = (y, m) => `${y}-${pad(m + 1)}`;
const noMes = (arr, y, m) => arr.filter(x => x.data && x.data.startsWith(prefixoMes(y, m)));
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const iniciais = n => { const p = String(n || '?').trim().split(/\s+/).filter(w => !/^(de|da|do|das|dos|e)$/i.test(w)); return ((p[0] || '?')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase(); };
const nomeCurto = n => { const p = String(n || '').trim().split(/\s+/).filter(w => !/^(de|da|do|das|dos|e)$/i.test(w)); return p.length > 1 ? `${p[0]} ${p[p.length - 1]}` : (p[0] || ''); };
const corDe = s => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return PALETA[h % PALETA.length]; };
const pctDelta = (a, b) => (b ? (a - b) / b * 100 : (a ? Infinity : 0));
const diasAte = ds => Math.round((parse(ds) - hoje()) / 86400000);

/* ---------- Armazenamento ---------- */
const KEY_PREF = 'adExtOrix.prefs.v2';
const vazio = () => ({ membros: [], entradas: [], despesas: [], eventos: [], cultos: {}, usuarios: [], log: [], config: { saldoInicial: 0, meta: 0, ultimoBackup: '', igreja: { ...IGREJA_PADRAO } } });
function normalizar(d) {
  d = d && typeof d === 'object' ? d : {};
  const b = vazio(), out = { ...b, ...d };
  out.config = { ...b.config, ...(d.config || {}) };
  out.config.igreja = { ...IGREJA_PADRAO, ...((d.config && d.config.igreja) || {}) };
  if (d.config && d.config.pastor && !out.config.igreja.pastor) out.config.igreja.pastor = d.config.pastor;
  delete out.config.pastor;
  ['membros', 'entradas', 'despesas', 'eventos', 'usuarios', 'log'].forEach(k => { if (!Array.isArray(out[k])) out[k] = []; });
  if (!out.cultos || typeof out.cultos !== 'object') out.cultos = {};
  return out;
}
function lerJSON(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
function gravarJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
let db = normalizar({});

/* ---------- Sincronização com o Firestore ----------
   O app trabalha com o objeto `db` em memória. `salvar()` compara com a última
   versão vinda do servidor e envia só o que mudou (criar/alterar/apagar).       */
const estavel = v => (v && typeof v === 'object' && !Array.isArray(v)
  ? '{' + Object.keys(v).filter(k => v[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + estavel(v[k])).join(',') + '}'
  : Array.isArray(v) ? '[' + v.map(estavel).join(',') + ']' : JSON.stringify(v ?? null));
const COLECOES = ['membros', 'entradas', 'despesas', 'eventos', 'cultos', 'log'];
let base = { membros: new Map(), entradas: new Map(), despesas: new Map(), eventos: new Map(), cultos: new Map(), log: new Map(), config: '' };
let unsubs = [];
const itensDe = col => (col === 'cultos' ? Object.entries(db.cultos) : db[col].map(x => [x.id, x]));
const podeGravar = col => ({ membros: edita('membros'), eventos: edita('eventos'), entradas: edita('financeiro'), despesas: edita('despesas'), cultos: edita('cultos'), log: !!usuario })[col];
function restaurar(col) {
  const objs = [...base[col].entries()].map(([id, s]) => [id, JSON.parse(s)]);
  if (col === 'cultos') db.cultos = Object.fromEntries(objs); else db[col] = objs.map(([, o]) => o);
}
function salvar() {
  if (!usuario) return;
  const ops = [];
  COLECOES.forEach(col => {
    const atual = new Map(itensDe(col).map(([id, o]) => [id, estavel(o)]));
    let mudou = false;
    atual.forEach((s, id) => { if (base[col].get(id) !== s) mudou = true; });
    base[col].forEach((_, id) => { if (!atual.has(id)) mudou = true; });
    if (!mudou) return;
    if (!podeGravar(col)) { restaurar(col); return; }
    atual.forEach((s, id) => { if (base[col].get(id) !== s) ops.push(['set', col, id, JSON.parse(s)]); });
    base[col].forEach((_, id) => { if (!atual.has(id)) ops.push(['del', col, id]); });
    base[col] = atual;
  });
  const cfg = estavel(db.config);
  if (cfg !== base.config) {
    if (papel() === 'admin') { ops.push(['set', 'config', 'geral', JSON.parse(cfg)]); base.config = cfg; }
    else if (base.config) db.config = normalizarConfig(JSON.parse(base.config));
  }
  enviar(ops);
}
async function enviar(ops) {
  for (let i = 0; i < ops.length; i += 400) {
    const lote = writeBatch(fs);
    ops.slice(i, i + 400).forEach(([tipo, col, id, dados]) => { const ref = doc(fs, col, id); if (tipo === 'set') lote.set(ref, dados); else lote.delete(ref); });
    try { await lote.commit(); }
    catch (e) { console.error(e); toast(e.code === 'permission-denied' ? 'Sem permissão para salvar esta alteração.' : 'Erro ao salvar na nuvem. Verifique a internet.', 'err'); }
  }
}
function normalizarConfig(d) { const b = vazio().config; const c = { ...b, ...(d || {}) }; c.igreja = { ...IGREJA_PADRAO, ...((d && d.igreja) || {}) }; return c; }
let renderTimer = 0, renderPendente = false;
function agendarRender() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(() => {
    const a = document.activeElement;
    if (a && $('#view') && $('#view').contains(a) && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) { renderPendente = true; return; }
    if (usuario) { render(false); atualizarSino(); }
  }, 150);
}
document.addEventListener('focusout', () => { if (renderPendente) { renderPendente = false; agendarRender(); } });
function pararListeners() { unsubs.forEach(u => { try { u(); } catch (e) { /* ignorado */ } }); unsubs = []; }
function iniciarListeners() {
  pararListeners();
  const erro = col => e => console.warn('Firestore', col, e.code);
  const lista = col => snap => { db[col] = snap.docs.map(d => ({ ...d.data(), id: d.id })); base[col] = new Map(db[col].map(x => [x.id, estavel(x)])); agendarRender(); };
  const ouvir = (col, q) => unsubs.push(onSnapshot(q || collection(fs, col), lista(col), erro(col)));
  ouvir('membros'); ouvir('eventos');
  if (pode('financeiro')) { ouvir('entradas'); ouvir('despesas'); }
  unsubs.push(onSnapshot(collection(fs, 'cultos'), snap => {
    db.cultos = {}; snap.docs.forEach(d => { db.cultos[d.id] = d.data(); });
    base.cultos = new Map(Object.entries(db.cultos).map(([k, v]) => [k, estavel(v)])); agendarRender();
  }, erro('cultos')));
  unsubs.push(onSnapshot(doc(fs, 'config', 'geral'), s => {
    db.config = normalizarConfig(s.exists() ? s.data() : {}); base.config = s.exists() ? estavel(db.config) : '';
    if (!s.exists() && papel() === 'admin') salvar();
    agendarRender();
  }, erro('config')));
  if (papel() === 'admin') {
    ouvir('log', query(collection(fs, 'log'), orderBy('t', 'desc'), limit(300)));
    unsubs.push(onSnapshot(collection(fs, 'users'), snap => { db.usuarios = snap.docs.map(d => ({ ...d.data(), id: d.id })); agendarRender(); }, erro('users')));
  }
  unsubs.push(onSnapshot(doc(fs, 'users', usuario.id), s => {
    if (!s.exists()) return;
    const novo = { ...s.data(), id: s.id };
    const mudouPapel = novo.papel !== usuario.papel || novo.ativo !== usuario.ativo;
    usuario = novo; renderUser();
    if (mudouPapel) { if (!PAPEIS[novo.papel] || novo.papel === 'pendente' || novo.ativo === false) { pararListeners(); telaPendente(); } else { iniciarListeners(); render(); } }
  }, erro('eu')));
}
let prefs = { tema: 'dark', sidebar: 'aberta', lidas: [], notifNav: false, antecedencia: 30, notificados: {}, agenda: 'cal', ...lerJSON(KEY_PREF, {}) };
const salvarPrefs = () => gravarJSON(KEY_PREF, prefs);

const IG = () => db.config.igreja;
const enderecoCompleto = () => { const g = IG(); return `${g.endereco} – ${g.bairro}, ${g.cidade} – ${g.uf}, ${g.cep}`; };
const enderecoBusca = () => { const g = IG(); return `${g.endereco}, ${g.bairro}, ${g.cidade} - ${g.uf}, ${g.cep}`; };
const linkMaps = () => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enderecoBusca())}`;
const linkZap = tel => { const d = String(tel || '').replace(/\D/g, ''); return d.length >= 10 ? `https://wa.me/55${d}` : ''; };

/* ---------- Regras da agenda de cultos ----------
   Domingo 08:00–10:00  Escola Bíblica Dominical
   Domingo 19:30–21:00  1º Senhoras · 2º Senhores · 3º Celebração · 4º Ceia
                        (mês com 5 domingos: 3º e 4º Celebração, 5º Ceia)
   Quarta  19:30–21:00  Culto de Treinamento
   Sexta   19:30–21:00  Culto de Oração
   Sábado  07:00–08:00  Círculo de Oração                                   */
function domingosNoMes(y, m) { let c = 0; const d = new Date(y, m, 1); while (d.getMonth() === m) { if (d.getDay() === 0) c++; d.setDate(d.getDate() + 1); } return c; }
function tipoDomingoNoite(date) {
  const n = Math.floor((date.getDate() - 1) / 7) + 1;
  const seq = domingosNoMes(date.getFullYear(), date.getMonth()) >= 5
    ? ['senhoras', 'senhores', 'celebracao', 'celebracao', 'ceia']
    : ['senhoras', 'senhores', 'celebracao', 'ceia'];
  return seq[n - 1] || 'celebracao';
}
function cultosDoDia(date) {
  const ds = iso(date), out = [];
  const add = (tipo, inicio, fim) => out.push({ key: `${ds}_${tipo}_${inicio.replace(':', '')}`, data: ds, tipo, inicio, fim, ...TIPOS_CULTO[tipo] });
  switch (date.getDay()) {
    case 0: add('ebd', '08:00', '10:00'); add(tipoDomingoNoite(date), '19:30', '21:00'); break;
    case 3: add('treinamento', '19:30', '21:00'); break;
    case 5: add('oracao', '19:30', '21:00'); break;
    case 6: add('circulo', '07:00', '08:00'); break;
  }
  return out;
}
function cultosDoMes(y, m) { const out = []; const d = new Date(y, m, 1); while (d.getMonth() === m) { out.push(...cultosDoDia(new Date(d))); d.setDate(d.getDate() + 1); } return out; }
const cultoPorKey = key => (key ? cultosDoDia(parse(key.slice(0, 10))).find(c => c.key === key) || null : null);
const horaEm = (ds, hhmm) => { const d = parse(ds); const [h, mi] = String(hhmm || '00:00').split(':').map(Number); d.setHours(h || 0, mi || 0, 0, 0); return d; };
const inicioDoCulto = c => horaEm(c.data, c.inicio);
const fimDoCulto = c => horaEm(c.data, c.fim);
function proximosCultos(n) {
  const agora = new Date(), out = [], d = hoje();
  for (let i = 0; i < 45 && out.length < n; i++) { for (const c of cultosDoDia(new Date(d))) if (fimDoCulto(c) > agora) out.push(c); d.setDate(d.getDate() + 1); }
  return out.slice(0, n);
}
const nomeCulto = key => { const c = cultoPorKey(key); return c ? c.nome : ''; };
function relativo(d) {
  const ms = d - new Date();
  if (ms <= 0) return 'agora';
  const min = Math.round(ms / 60000);
  const dias = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - hoje()) / 86400000);
  if (min < 60) return `em ${min} min`;
  if (dias === 0) return `em ${Math.round(min / 60)} h`;
  if (dias === 1) return 'amanhã';
  return `em ${dias} dias`;
}

/* =====================================================================
   Autenticação (local, versão de teste)
   ===================================================================== */
let usuario = null;
const papel = () => (usuario ? usuario.papel : 'leitor');
const pode = rota => { const a = ACESSO[papel()] || []; return a === '*' || a.includes(rota); };
const edita = area => { const a = EDITA[papel()] || []; return a === '*' || a.includes(area); };
const ERROS_AUTH = {
  'auth/invalid-credential': 'E-mail ou senha incorretos.', 'auth/wrong-password': 'E-mail ou senha incorretos.', 'auth/user-not-found': 'E-mail ou senha incorretos.',
  'auth/invalid-login-credentials': 'E-mail ou senha incorretos.', 'auth/email-already-in-use': 'Este e-mail já tem conta. Use a opção "Entrar".',
  'auth/weak-password': 'Senha fraca: use pelo menos 6 caracteres.', 'auth/invalid-email': 'E-mail inválido.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos e tente de novo.', 'auth/network-request-failed': 'Sem conexão com a internet.',
  'auth/operation-not-allowed': 'O login por e-mail ainda não foi ativado no Firebase.', 'auth/requires-recent-login': 'Por segurança, saia e entre de novo antes de fazer isso.',
  'auth/missing-password': 'Informe a senha.',
};
const msgAuth = e => ERROS_AUTH[e && e.code] || `Não foi possível concluir (${(e && e.code) || 'erro'}).`;
function registrar(acao, det = '') { db.log.unshift({ id: uid(), t: new Date().toISOString(), u: usuario ? usuario.nome : 'Sistema', acao, det }); if (db.log.length > 300) db.log.length = 300; }

/* =====================================================================
   Componentes de interface
   ===================================================================== */
/* Modal */
const modal = $('#modal'), mForm = $('#modalForm');
let mCtx = null;
function abrirModal({ titulo, corpo, rodape, aoSalvar, aoAbrir, acoes, largo }) {
  $('#modalTitle').textContent = titulo;
  $('#modalBody').innerHTML = corpo;
  $('#modalFoot').innerHTML = rodape ?? `<button type="button" class="btn" data-close>Cancelar</button><button type="submit" class="btn primary">${ic('check')} Salvar</button>`;
  modal.style.width = largo ? 'min(820px, calc(100vw - 24px))' : '';
  mCtx = { aoSalvar, acoes: acoes || {} };
  if (!modal.open) modal.showModal();
  $('#modalBody').scrollTop = 0;
  if (aoAbrir) aoAbrir(mForm);
}
function fecharModal() { if (modal.open) modal.close(); }
modal.addEventListener('close', () => { mCtx = null; });
modal.addEventListener('click', e => { if (e.target === modal) fecharModal(); });
mForm.addEventListener('submit', async e => {
  e.preventDefault();
  if (!mCtx || !mCtx.aoSalvar) return fecharModal();
  if (!mForm.reportValidity()) return;
  const r = await mCtx.aoSalvar(Object.fromEntries(new FormData(mForm)), mForm);
  if (r !== false) fecharModal();
});
mForm.addEventListener('click', e => {
  if (e.target.closest('[data-close]')) { fecharModal(); return; }
  const a = e.target.closest('[data-mact]');
  if (a && mCtx && mCtx.acoes[a.dataset.mact]) { e.preventDefault(); mCtx.acoes[a.dataset.mact](Object.fromEntries(new FormData(mForm)), a); }
});

const campo = (rotulo, controle, cls = '') => `<label class="field ${cls}"><span class="fl">${rotulo}</span>${controle}</label>`;
const inp = (name, value = '', type = 'text', extra = '') => `<input name="${name}" type="${type}" value="${esc(value)}" ${extra}>`;
const sel = (name, opcoes, value, extra = '') => `<select name="${name}" ${extra}>${opcoes.map(o => { const [v, t] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${String(v) === String(value ?? '') ? 'selected' : ''}>${esc(t)}</option>`; }).join('')}</select>`;
const txt = (name, value = '', extra = '') => `<textarea name="${name}" ${extra}>${esc(value)}</textarea>`;
const pwField = (name, ac, extra = '') => `<span class="pw"><input name="${name}" type="password" minlength="6" autocomplete="${ac}" ${extra}><button type="button" data-act="verSenha" aria-label="Mostrar ou ocultar senha">${ic('eye')}</button></span>`;

/* Toasts */
function toast(msg, tipo = 'info') {
  const w = $('#toasts'), el = document.createElement('div');
  el.className = 'toast ' + tipo;
  el.innerHTML = `<span class="ti">${ic({ ok: 'check', err: 'x', warn: 'alert', info: 'bell' }[tipo] || 'bell')}</span><span>${esc(msg)}</span>`;
  w.appendChild(el);
  while (w.children.length > 4) w.firstChild.remove();
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, 3600);
}

/* Tooltip */
const tipEl = $('#tip');
document.addEventListener('mouseover', e => {
  const el = e.target.closest && e.target.closest('[data-tip]');
  const mini = document.body.classList.contains('sb-mini') && innerWidth > 900;
  if (!el || (el.hasAttribute('data-tip-mini') && !mini)) { tipEl.classList.remove('show'); return; }
  tipEl.textContent = el.getAttribute('data-tip');
  tipEl.classList.add('show');
  const r = el.getBoundingClientRect(), tw = tipEl.offsetWidth, th = tipEl.offsetHeight;
  let x, y;
  if (el.closest('.sidebar')) { x = r.right + 12; y = r.top + r.height / 2 - th / 2; }
  else { x = r.left + r.width / 2 - tw / 2; y = r.top - th - 8; if (y < 8) y = r.bottom + 8; }
  tipEl.style.left = Math.max(8, Math.min(innerWidth - tw - 8, x)) + 'px';
  tipEl.style.top = Math.max(8, y) + 'px';
});
addEventListener('scroll', () => tipEl.classList.remove('show'), true);

/* Componentes pequenos */
const avatar = (nome, cls = '', foto = '') => `<span class="av ${cls}" style="--av:${corDe(nome)}">${foto && /^data:image\//.test(foto) ? `<img src="${esc(foto)}" alt="">` : esc(iniciais(nome))}</span>`;
const fotoDe = nome => { const mb = db.membros.find(x => x.nome === nome); return mb ? mb.foto || '' : ''; };
function imprimirHtml(html) {
  const f = document.createElement('iframe');
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(f);
  f.onload = () => setTimeout(() => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { toast('Não foi possível imprimir aqui.', 'warn'); } setTimeout(() => f.remove(), 3000); }, 350);
  f.srcdoc = html;
}
/* Reduz a foto para caber no banco (JPEG ~320px) */
function reduzirFoto(file) {
  return new Promise((ok, falha) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const lado = 320, s = Math.min(img.width, img.height), c = document.createElement('canvas');
      c.width = c.height = lado;
      c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, lado, lado);
      URL.revokeObjectURL(url); ok(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); falha(new Error('imagem')); };
    img.src = url;
  });
}
const pill = (t, cor) => `<span class="pill" style="--p:${cor}"><i></i>${esc(t)}</span>`;
const vazioHtml = (icone, texto, extra = '') => `<div class="empty">${ic(icone)}<span>${texto}</span>${extra}</div>`;
const dbox = (ds, c1, c2) => { const d = parse(ds); return `<span class="dbox" ${c1 ? `style="--c1:${c1};--c2:${c2 || c1}"` : ''}><b>${pad(d.getDate())}</b><span>${MESES_C[d.getMonth()]}</span></span>`; };
const cardH = (icone, titulo, c1, c2, extra = '') => `<div class="card-h"><span class="ic-b" style="--c1:${c1};--c2:${c2}">${ic(icone)}</span><h3>${titulo}</h3><span class="sp"></span>${extra}</div>`;
const navMes = () => `
  <div class="month-nav">
    <button data-act="mesAnt" aria-label="Mês anterior">${ic('left')}</button>
    <strong>${MESES[ui.m]} ${ui.y}</strong>
    <button data-act="mesProx" aria-label="Próximo mês">${ic('right')}</button>
  </div>
  <button class="btn sm" data-act="mesAtual">Hoje</button>`;
function deltaPill(d, inverso) {
  if (d === Infinity) return '<span class="delta neu">novo</span>';
  if (!isFinite(d) || Math.abs(d) < 0.5) return '<span class="delta neu">= 0%</span>';
  const up = d > 0, bom = inverso ? !up : up;
  return `<span class="delta ${bom ? 'up' : 'down'}" data-tip="comparado ao mês anterior">${ic(up ? 'trendUp' : 'trendDown')}${Math.abs(d).toFixed(0)}%</span>`;
}
const kpi = o => `
  <div class="kpi" style="--k1:${o.c1};--k2:${o.c2}">
    <div class="kpi-top"><span class="kpi-ic">${ic(o.ic)}</span>${o.delta !== undefined ? deltaPill(o.delta, o.inverso) : ''}</div>
    <div class="kpi-lbl">${o.label}</div>
    <div class="kpi-val" data-count="${Number(o.valor) || 0}" data-fmt="${o.fmt || 'brl'}">${o.fmt === 'int' ? (Number(o.valor) || 0).toLocaleString('pt-BR') : brl(o.valor)}</div>
    <div class="kpi-foot"><small>${o.sub || ''}</small>${o.spark ? sparkline(o.spark, o.c1) : ''}</div>
  </div>`;

/* Animação de números */
function animarNumeros(root) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  $$('[data-count]', root).forEach(el => {
    const alvo = Number(el.dataset.count) || 0, fmt = el.dataset.fmt, t0 = performance.now(), dur = 900;
    const f = v => (fmt === 'int' ? Math.round(v).toLocaleString('pt-BR') : brl(v));
    const passo = t => { const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = f(alvo * e); if (p < 1) requestAnimationFrame(passo); else el.textContent = f(alvo); };
    requestAnimationFrame(passo);
  });
}

/* Contagem regressiva + relógio */
const bloco = (v, l) => `<span class="cd-b"><b>${pad(v)}</b><small>${l}</small></span>`;
function tick() {
  const agora = new Date();
  $$('[data-cd]').forEach(el => {
    const ini = new Date(Number(el.dataset.cd)), fim = new Date(Number(el.dataset.cdFim));
    if (agora >= ini && agora < fim) { if (!el.classList.contains('is-live')) { el.classList.add('is-live'); el.innerHTML = '<span class="live-dot"></span> ACONTECENDO AGORA'; } return; }
    if (agora >= fim) { el.textContent = 'Encerrado'; return; }
    let s = Math.floor((ini - agora) / 1000);
    const d = Math.floor(s / 86400); s %= 86400; const h = Math.floor(s / 3600); s %= 3600; const m = Math.floor(s / 60); s %= 60;
    el.innerHTML = (d ? bloco(d, d === 1 ? 'dia' : 'dias') : '') + bloco(h, 'horas') + bloco(m, 'min') + bloco(s, 'seg');
  });
  $$('[data-clock]').forEach(el => { el.innerHTML = `<b>${agora.toLocaleTimeString('pt-BR')}</b><small>${agora.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</small>`; });
}

/* ---------- Gráficos (SVG próprios, funcionam offline) ---------- */
const niceMax = v => { if (v <= 0) return 1; const p = 10 ** Math.floor(Math.log10(v)), f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; };
function areaChart(series, labels, { h = 250, fmt = brlCurto, fmtTip = brl, destaque = -1 } = {}) {
  const W = 680, H = h, pl = 62, pr = 14, pt = 14, pb = 30, n = labels.length;
  const max = niceMax(Math.max(0, ...series.flatMap(s => s.v)));
  const x = i => pl + (n === 1 ? (W - pl - pr) / 2 : i * (W - pl - pr) / (n - 1));
  const y = v => pt + (H - pt - pb) * (1 - v / max);
  const gid = 'g' + uid();
  let grid = '';
  for (let k = 0; k <= 4; k++) { const v = max * k / 4, yy = y(v); grid += `<line x1="${pl}" x2="${W - pr}" y1="${yy}" y2="${yy}" class="gl"/><text x="${pl - 10}" y="${yy + 4}" text-anchor="end" class="gt">${fmt(v)}</text>`; }
  const caminho = v => v.map((val, i) => { if (i === 0) return `M${x(0)},${y(val)}`; const x0 = x(i - 1), x1 = x(i), cx = (x0 + x1) / 2; return `C${cx},${y(v[i - 1])} ${cx},${y(val)} ${x1},${y(val)}`; }).join(' ');
  const defs = series.map((s, j) => `<linearGradient id="${gid}${j}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${s.cor}" stop-opacity=".38"/><stop offset="1" stop-color="${s.cor}" stop-opacity="0"/></linearGradient>`).join('');
  const areas = series.map((s, j) => `<path d="${caminho(s.v)} L${x(n - 1)},${y(0)} L${x(0)},${y(0)} Z" fill="url(#${gid}${j})"/><path d="${caminho(s.v)}" fill="none" stroke="${s.cor}" stroke-width="2.6" stroke-linecap="round"/>`).join('');
  const pts = series.map(s => s.v.map((val, i) => `<circle cx="${x(i)}" cy="${y(val)}" r="4" fill="${s.cor}" stroke="var(--solid)" stroke-width="2" class="pt"/>`).join('')).join('');
  const passo = (W - pl - pr) / Math.max(1, n - 1);
  const hits = labels.map((l, i) => `<rect class="hit" x="${x(i) - passo / 2}" y="${pt}" width="${passo}" height="${H - pt - pb}" fill="transparent" rx="8" data-tip="${esc(l)} · ${series.map(s => `${s.nome}: ${fmtTip(s.v[i])}`).join(' · ')}"/>`).join('');
  const xl = labels.map((l, i) => `<text x="${x(i)}" y="${H - 8}" text-anchor="middle" class="gt ${i === destaque ? 'hl' : ''}">${esc(l)}</text>`).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico"><defs>${defs}</defs>${grid}${hits}${areas}${pts}${xl}</svg>`;
}
function donut(pares, cores, centro, sub) {
  const total = pares.reduce((s, p) => s + p[1], 0);
  if (!total) return vazioHtml('chart', 'Sem dados neste período.');
  let off = 0;
  const segs = pares.map(([k, v], i) => {
    const pct = v / total * 100, len = Math.max(pct - (pares.length > 1 ? 0.8 : 0), 0.3);
    const s = `<circle r="15.915" cx="21" cy="21" fill="none" stroke="${cores[i]}" stroke-width="5.2" stroke-dasharray="${len} ${100 - len}" stroke-dashoffset="${-off}" class="seg" data-tip="${esc(k)}: ${brl(v)} (${pct.toFixed(1)}%)"/>`;
    off += pct; return s;
  }).join('');
  return `<div class="donut-wrap">
    <svg viewBox="0 0 42 42" class="donut" role="img" aria-label="Gráfico de rosca"><g transform="rotate(-90 21 21)"><circle r="15.915" cx="21" cy="21" fill="none" class="donut-track" stroke-width="5.2"/>${segs}</g>
      <text x="21" y="21.5" text-anchor="middle" class="dn-v">${esc(centro)}</text><text x="21" y="26" text-anchor="middle" class="dn-s">${esc(sub)}</text></svg>
    <ul class="legend-list">${pares.map(([k, v], i) => `<li><i style="background:${cores[i]}"></i><span>${esc(k)}</span><b>${brl(v)}</b><small>${(v / total * 100).toFixed(0)}%</small></li>`).join('')}</ul>
  </div>`;
}
function sparkline(v, cor) {
  const W = 100, H = 32, max = Math.max(...v), min = Math.min(...v, 0), rng = (max - min) || 1;
  const x = i => i * W / ((v.length - 1) || 1), y = val => H - 3 - (H - 6) * ((val - min) / rng);
  const pts = v.map((val, i) => `${x(i).toFixed(1)},${y(val).toFixed(1)}`).join(' '), id = 's' + uid();
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${cor}" stop-opacity=".45"/><stop offset="1" stop-color="${cor}" stop-opacity="0"/></linearGradient></defs><polygon points="0,${H} ${pts} ${W},${H}" fill="url(#${id})"/><polyline points="${pts}" fill="none" stroke="${cor}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>`;
}
function ring(pct, c1, c2) {
  const p = Math.min(100, Math.max(0, pct)), id = 'r' + uid();
  return `<svg viewBox="0 0 42 42" class="ring" aria-hidden="true"><defs><linearGradient id="${id}"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><circle r="16" cx="21" cy="21" fill="none" class="donut-track" stroke-width="4.5"/><circle r="16" cx="21" cy="21" fill="none" stroke="url(#${id})" stroke-width="4.5" stroke-linecap="round" pathLength="100" stroke-dasharray="${p} 100" transform="rotate(-90 21 21)"/><text x="21" y="23.8" text-anchor="middle" class="rg-v">${Math.round(pct)}%</text></svg>`;
}

/* ---------- Cartão de culto ---------- */
function statusCulto(c) {
  const agora = new Date(), ini = inicioDoCulto(c), fim = fimDoCulto(c), reg = db.cultos[c.key];
  if (agora >= ini && agora < fim) return ['live', 'Ao vivo'];
  if (agora >= fim) return reg ? ['done', 'Realizado'] : ['miss', 'Sem registro'];
  if (c.data === iso(hoje())) return ['today', `Hoje · ${relativo(ini)}`];
  return ['', relativo(ini)];
}
function cultoCard(c) {
  const r = db.cultos[c.key], [st, stTxt] = statusCulto(c), d = parse(c.data);
  const arrec = pode('financeiro') ? soma(db.entradas.filter(e => e.cultoKey === c.key)) : 0;
  const pres = r && r.presentes !== '' && r.presentes != null;
  const foot = [
    pres ? `<span>${ic('users')} ${r.presentes} presentes</span>` : '',
    arrec ? `<span>${ic('wallet')} ${brl(arrec)}</span>` : '',
    r && r.pregador ? `<span>${ic('user')} ${esc(nomeCurto(r.pregador))}</span>` : '',
  ].filter(Boolean).join('') || `<em>${st === 'done' || st === 'miss' ? 'Toque para registrar' : 'Programação fixa'}</em>`;
  return `<button class="cc" style="--c1:${c.cor};--c2:${c.cor2}" data-act="abrirCulto" data-key="${c.key}">
    <span class="cc-glow"></span>
    <span class="cc-head"><span class="cc-ic">${ic(c.ic)}</span><span class="cc-st ${st}">${esc(stTxt)}</span></span>
    <span class="cc-name">${esc(c.nome)}</span>
    <span class="cc-when">${ic('clock')} ${DIAS_C[d.getDay()]}, ${fmtDM(c.data)} · ${c.inicio}–${c.fim}</span>
    <span class="cc-foot">${foot}</span>
  </button>`;
}

/* =====================================================================
   Estado da interface
   ===================================================================== */
const ui = { y: hoje().getFullYear(), m: hoje().getMonth(), f: { tipo: '', busca: '', cat: '', depto: '', evt: 'proximos', mbusca: '', log: '' }, adminTab: 'usuarios' };
let rotaAtual = 'painel';

function resumoMes(y, m) {
  const e = noMes(db.entradas, y, m), d = noMes(db.despesas, y, m);
  const diz = soma(e.filter(x => x.tipo === 'Dízimo')), tot = soma(e), des = soma(d);
  return { e, d, diz, ofe: tot - diz, tot, des, saldo: tot - des };
}
const mesesAtras = (n, y, m) => [...Array(n)].map((_, i) => { const d = new Date(y, m - (n - 1) + i, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
function saldoAte(y, m) { const lim = prefixoMes(y, m) + '-99'; return (Number(db.config.saldoInicial) || 0) + soma(db.entradas.filter(e => e.data <= lim)) - soma(db.despesas.filter(d => d.data <= lim)); }

/* =====================================================================
   PAINEL
   ===================================================================== */
function vPainel() {
  const t = hoje(), y = t.getFullYear(), m = t.getMonth(), agora = new Date(), hIso = iso(t);
  const fin = pode('financeiro');
  const ant = new Date(y, m - 1, 1);
  const r = resumoMes(y, m), ra = resumoMes(ant.getFullYear(), ant.getMonth());
  const seis = mesesAtras(6, y, m);
  const rs = seis.map(x => resumoMes(x.y, x.m));
  const h = agora.getHours(), saud = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  const hojeC = cultosDoDia(t).filter(c => fimDoCulto(c) > agora);
  const prox = proximosCultos(1)[0];
  const g = IG();

  let kpis;
  if (fin) {
    kpis = [
      kpi({ ic: 'heart', c1: '#8b5cf6', c2: '#6366f1', label: `Dízimos · ${MESES_C[m]}`, valor: r.diz, delta: pctDelta(r.diz, ra.diz), spark: rs.map(s => s.diz), sub: `${r.e.filter(e => e.tipo === 'Dízimo').length} lançamentos` }),
      kpi({ ic: 'gift', c1: '#06b6d4', c2: '#3b82f6', label: `Ofertas · ${MESES_C[m]}`, valor: r.ofe, delta: pctDelta(r.ofe, ra.ofe), spark: rs.map(s => s.ofe), sub: `${r.e.filter(e => e.tipo !== 'Dízimo').length} lançamentos` }),
      kpi({ ic: 'receipt', c1: '#f43f5e', c2: '#f97316', label: `Despesas · ${MESES_C[m]}`, valor: r.des, delta: pctDelta(r.des, ra.des), inverso: true, spark: rs.map(s => s.des), sub: `${r.d.length} lançamentos` }),
      kpi({ ic: 'wallet', c1: '#10b981', c2: '#14b8a6', label: 'Saldo em caixa', valor: saldoAte(y, m), spark: seis.map(x => saldoAte(x.y, x.m)), sub: `Resultado do mês ${brl(r.saldo)}` }),
    ];
  } else {
    const comReg = cultosDoMes(y, m).map(c => db.cultos[c.key]).filter(x => x && x.presentes !== '' && x.presentes != null);
    const media = comReg.length ? Math.round(comReg.reduce((s, x) => s + Number(x.presentes), 0) / comReg.length) : 0;
    const evs = db.eventos.filter(e => { const d = diasAte(e.data); return d >= 0 && d <= 30; }).length;
    kpis = [
      kpi({ ic: 'users', c1: '#8b5cf6', c2: '#6366f1', label: 'Membros ativos', valor: db.membros.filter(x => x.ativo !== false).length, fmt: 'int', sub: `${db.membros.length} cadastrados` }),
      kpi({ ic: 'calendar', c1: '#06b6d4', c2: '#3b82f6', label: `Cultos em ${MESES_C[m]}`, valor: comReg.length, fmt: 'int', sub: 'com registro de presença' }),
      kpi({ ic: 'activity', c1: '#10b981', c2: '#14b8a6', label: 'Média de presença', valor: media, fmt: 'int', sub: 'pessoas por culto' }),
      kpi({ ic: 'sparkles', c1: '#ec4899', c2: '#f97316', label: 'Eventos', valor: evs, fmt: 'int', sub: 'nos próximos 30 dias' }),
    ];
  }

  const ini = prox ? inicioDoCulto(prox) : null, fim = prox ? fimDoCulto(prox) : null;
  const nextHtml = prox ? `
    <section class="next" style="--c1:${prox.cor};--c2:${prox.cor2}">
      <div class="next-bg">${ic(prox.ic)}</div>
      <div class="next-body">
        <span class="eyebrow">${ic('zap')} Próximo culto</span>
        <h2>${esc(prox.nome)}</h2>
        <p>${ic('calendar')} ${DIAS[ini.getDay()]}, ${fmtData(prox.data)} · ${prox.inicio} às ${prox.fim}</p>
        <div class="countdown" data-cd="${+ini}" data-cd-fim="${+fim}"></div>
        <div class="next-actions">
          <button class="btn glass" data-act="abrirCulto" data-key="${prox.key}">${ic('edit')} ${edita('cultos') ? 'Registrar culto' : 'Ver detalhes'}</button>
          <a class="btn glass" href="#cultos">${ic('calendar')} Agenda completa</a>
        </div>
      </div>
    </section>` : '';

  const metaV = Number(db.config.meta) || 0;
  const metaCard = fin && metaV > 0 ? `
    <div class="card">${cardH('target', `Meta de ${MESES[m]}`, '#f59e0b', '#ec4899')}
      <div class="meta-in">${ring(r.tot / metaV * 100, '#f59e0b', '#ec4899')}
        <div><b class="big">${brl(r.tot)}</b><small>de ${brl(metaV)} em entradas</small><p>${r.tot >= metaV ? '🎉 Meta alcançada!' : `Faltam ${brl(metaV - r.tot)}`}</p></div></div></div>` : '';

  let graficos = '';
  if (fin) {
    const doze = mesesAtras(12, y, m), rd = doze.map(x => resumoMes(x.y, x.m));
    const porTipo = TIPOS_ENTRADA.map(tp => [tp, soma(r.e.filter(e => e.tipo === tp))]).filter(p => p[1] > 0);
    graficos = `
    <div class="grid g21">
      <div class="card">${cardH('chart', 'Fluxo de caixa · últimos 12 meses', '#8b5cf6', '#06b6d4', `<span class="legend"><span><i style="background:#10b981"></i>Entradas</span><span><i style="background:#f43f5e"></i>Saídas</span></span>`)}
        ${areaChart([{ nome: 'Entradas', cor: '#10b981', v: rd.map(s => s.tot) }, { nome: 'Saídas', cor: '#f43f5e', v: rd.map(s => s.des) }], doze.map(x => `${MESES_C[x.m]}/${String(x.y).slice(2)}`), { destaque: 11 })}
      </div>
      <div class="col">
        <div class="card">${cardH('gift', `Entradas de ${MESES[m]}`, '#06b6d4', '#8b5cf6')}${donut(porTipo, porTipo.map(p => COR_ENTRADA[p[0]]), brlCurto(r.tot), 'no mês')}</div>
        ${metaCard}
      </div>
    </div>`;
  } else {
    const ult = [];
    for (let k = 0; k < 3 && ult.length < 10; k++) {
      const d = new Date(y, m - k, 1);
      cultosDoMes(d.getFullYear(), d.getMonth()).reverse().forEach(c => { const rr = db.cultos[c.key]; if (rr && rr.presentes !== '' && rr.presentes != null && ult.length < 10) ult.push({ c, p: Number(rr.presentes) }); });
    }
    ult.reverse();
    graficos = ult.length > 1 ? `<div class="card">${cardH('activity', 'Presença nos últimos cultos', '#10b981', '#06b6d4')}
      ${areaChart([{ nome: 'Presentes', cor: '#8b5cf6', v: ult.map(u => u.p) }], ult.map(u => fmtDM(u.c.data)), { fmt: v => Math.round(v), fmtTip: v => `${v} pessoas`, h: 220 })}</div>` : '';
  }

  const eventos = db.eventos.filter(e => e.data >= hIso).sort((a, b) => (a.data + (a.inicio || '')).localeCompare(b.data + (b.inicio || ''))).slice(0, 5);
  const evHtml = eventos.length ? `<div class="list">${eventos.map(e => { const c = corDe(e.titulo); return `
    <button class="li" data-act="editarEvento" data-id="${e.id}">${dbox(e.data, c, PALETA[(PALETA.indexOf(c) + 1) % PALETA.length])}
      <span class="info"><b>${esc(e.titulo)}</b><small>${e.inicio ? esc(e.inicio) + ' · ' : ''}${esc(e.local || '')}</small></span>
      <span class="pill" style="--p:${c}">${diasAte(e.data) === 0 ? 'hoje' : diasAte(e.data) === 1 ? 'amanhã' : `${diasAte(e.data)} dias`}</span>
    </button>`; }).join('')}</div>` : vazioHtml('sparkles', 'Nenhum evento agendado.');

  const aniv = db.membros.filter(mb => mb.ativo !== false && mb.nascimento && parse(mb.nascimento).getMonth() === m).sort((a, b) => parse(a.nascimento).getDate() - parse(b.nascimento).getDate());
  const anivHtml = aniv.length ? `<div class="list">${aniv.slice(0, 7).map(mb => {
    const d = parse(mb.nascimento).getDate(), ehHoje = d === t.getDate(), zap = linkZap(mb.telefone);
    return `<div class="li">${avatar(mb.nome)}<span class="info"><b>${esc(mb.nome)}${ehHoje ? '<span class="tag-today">HOJE 🎂</span>' : ''}</b><small>${pad(d)}/${pad(m + 1)} · ${esc(mb.departamento || mb.cargo || '')}</small></span>${zap ? `<a class="btn ico" href="${zap}" target="_blank" rel="noopener" data-tip="Parabenizar no WhatsApp" aria-label="WhatsApp">${ic('msg')}</a>` : ''}</div>`;
  }).join('')}</div>` : vazioHtml('cake', 'Nenhum aniversariante neste mês.');

  let terceiro;
  if (papel() === 'admin' && db.log.length) {
    terceiro = `<div class="card">${cardH('activity', 'Atividade recente', '#06b6d4', '#10b981', `<button class="btn sm" data-act="irAdminLog">Ver tudo</button>`)}
      <div class="list">${db.log.slice(0, 6).map(l => `<div class="li">${avatar(l.u)}<span class="info"><b>${esc(l.acao)}</b><small>${esc(l.u)} · ${fmtDataHora(l.t)}${l.det ? ' · ' + esc(l.det) : ''}</small></span></div>`).join('')}</div></div>`;
  } else {
    const doms = cultosDoMes(y, m).filter(c => parse(c.data).getDay() === 0 && c.tipo !== 'ebd');
    terceiro = `<div class="card">${cardH('music', `Domingos à noite · ${MESES[m]}`, '#f97316', '#ec4899')}
      <div class="list">${doms.map((c, i) => `<button class="li" data-act="abrirCulto" data-key="${c.key}">${dbox(c.data, c.cor, c.cor2)}<span class="info"><b>${i + 1}º domingo · ${esc(c.nome)}</b><small>19:30 às 21:00</small></span></button>`).join('')}</div></div>`;
  }

  return `
  <div class="welcome">
    <div><h2>${saud}, <span>${esc((usuario.nome || '').split(' ')[0])}</span> 👋</h2>
    <p>${hojeC.length ? `Hoje tem ${hojeC.map(c => `<b>${esc(c.nome)}</b> às ${c.inicio}`).join(' e ')}.` : 'Nenhum culto restante para hoje.'}</p></div>
    <div class="clock" data-clock></div>
  </div>
  <div class="hero-row">
    ${nextHtml}
    <section class="church" style="background-image:url('img/igreja.jpg')">
      <div class="church-in">
        <img src="img/logo.png" alt="">
        <span class="tag">${esc(g.extensao)} · desde ${esc(g.desde)}</span>
        <b>${esc(g.nome)}</b>
        <small>${ic('pin')} ${esc(enderecoCompleto())}</small>
        <small>${ic('phone')} ${esc(g.telefone)}</small>
      </div>
    </section>
  </div>
  <div class="grid g4">${kpis.join('')}</div>
  ${graficos}
  <div class="card">${cardH('calendar', 'Programação dos próximos dias', '#8b5cf6', '#ec4899', '<a class="btn sm" href="#cultos">Ver agenda</a>')}
    <div class="strip">${proximosCultos(8).map(cultoCard).join('')}</div>
  </div>
  <div class="grid g3">
    <div class="card">${cardH('sparkles', 'Próximos eventos', '#ec4899', '#f97316', edita('eventos') ? `<button class="btn sm" data-act="novoEvento">${ic('plus')} Evento</button>` : '')}${evHtml}</div>
    <div class="card">${cardH('cake', `Aniversariantes de ${MESES[m]}`, '#f59e0b', '#ec4899')}${anivHtml}</div>
    ${terceiro}
  </div>`;
}

/* =====================================================================
   AGENDA DE CULTOS
   ===================================================================== */
function vCultos() {
  const y = ui.y, m = ui.m, hIso = iso(hoje());
  const evPorDia = {};
  db.eventos.forEach(e => { (evPorDia[e.data] = evPorDia[e.data] || []).push(e); });
  const modo = prefs.agenda === 'cards' ? 'cards' : 'cal';
  let corpo = '';

  // lista (celular)
  let lista = '';
  for (let d = new Date(y, m, 1); d.getMonth() === m; d.setDate(d.getDate() + 1)) {
    const ds = iso(d), cs = cultosDoDia(new Date(d)), evs = evPorDia[ds] || [];
    lista += cs.map(c => `<button class="li" data-act="abrirCulto" data-key="${c.key}">${dbox(ds, c.cor, c.cor2)}<span class="info"><b>${esc(c.nome)}${db.cultos[c.key] ? ' ✓' : ''}${ds === hIso ? '<span class="tag-today">HOJE</span>' : ''}</b><small>${DIAS[d.getDay()]} · ${c.inicio} às ${c.fim}</small></span></button>`).join('')
      + evs.map(e => `<button class="li" data-act="editarEvento" data-id="${e.id}">${dbox(ds, '#ec4899', '#f97316')}<span class="info"><b>🎉 ${esc(e.titulo)}</b><small>${esc(e.inicio || '')} ${esc(e.local || '')}</small></span></button>`).join('');
  }

  if (modo === 'cal') {
    const ini = new Date(y, m, 1 - new Date(y, m, 1).getDay());
    const ult = new Date(y, m + 1, 0), fim = new Date(y, m + 1, 6 - ult.getDay());
    let cells = DIAS_C.map(d => `<div class="dow">${d}</div>`).join('');
    for (let d = new Date(ini); d <= fim; d.setDate(d.getDate() + 1)) {
      const ds = iso(d), fora = d.getMonth() !== m;
      const chips = cultosDoDia(new Date(d)).map(c => `<button class="ev-chip" style="--c:${c.cor}" data-act="abrirCulto" data-key="${c.key}" data-tip="${esc(c.nome)} · ${c.inicio}–${c.fim}"><i></i><span>${c.inicio} ${esc(c.curto)}${db.cultos[c.key] ? ' ✓' : ''}</span></button>`).join('')
        + (evPorDia[ds] || []).map(e => `<button class="ev-chip evt" data-act="editarEvento" data-id="${e.id}" data-tip="${esc(e.titulo)}"><i></i><span>${e.inicio ? esc(e.inicio) + ' ' : ''}${esc(e.titulo)}</span></button>`).join('');
      cells += `<div class="day ${fora ? 'out' : ''} ${ds === hIso ? 'is-today' : ''}"><span class="n"><b>${d.getDate()}</b></span>${chips}</div>`;
    }
    corpo = `<div class="cal">${cells}</div>`;
  } else {
    const semanas = {};
    const off = new Date(y, m, 1).getDay();
    cultosDoMes(y, m).forEach(c => { const w = Math.floor((parse(c.data).getDate() - 1 + off) / 7); (semanas[w] = semanas[w] || []).push(c); });
    corpo = `<div class="cards-mes">${Object.entries(semanas).map(([w, cs]) => `
      <div class="week-h"><b>Semana ${Number(w) + 1}</b><small>${fmtDM(cs[0].data)} a ${fmtDM(cs[cs.length - 1].data)}</small></div>
      <div class="cc-grid">${cs.map(cultoCard).join('')}</div>`).join('')}</div>`;
  }

  const doms = cultosDoMes(y, m).filter(c => parse(c.data).getDay() === 0 && c.tipo !== 'ebd');
  const fixos = [['ebd', 'Domingo', '08:00 – 10:00'], ['celebracao', 'Domingo', '19:30 – 21:00 (escala ao lado)'], ['treinamento', 'Quarta-feira', '19:30 – 21:00'], ['oracao', 'Sexta-feira', '19:30 – 21:00'], ['circulo', 'Sábado', '07:00 – 08:00']];
  return `
  <div class="toolbar no-print">${navMes()}
    <div class="seg-c"><button class="${modo === 'cal' ? 'on' : ''}" data-act="agendaModo" data-modo="cal">${ic('calendar')} Calendário</button><button class="${modo === 'cards' ? 'on' : ''}" data-act="agendaModo" data-modo="cards">${ic('grid')} Cartões</button></div>
    <span class="sp"></span>${edita('eventos') ? `<button class="btn primary" data-act="novoEvento">${ic('plus')} Novo evento</button>` : ''}
  </div>
  <div class="legend">${Object.values(TIPOS_CULTO).map(tc => `<span><i style="background:${tc.cor}"></i>${tc.nome}</span>`).join('')}<span><i style="background:#ec4899;outline:1px dashed #ec4899;outline-offset:1px"></i>Evento</span><span>✓ Com registro</span></div>
  ${modo === 'cal' ? `${corpo}<div class="card cal-list"><div class="list">${lista || vazioHtml('calendar', 'Sem cultos.')}</div></div>` : corpo}
  <div class="grid g2">
    <div class="card">${cardH('clock', 'Programação semanal', '#8b5cf6', '#06b6d4')}
      ${fixos.map(([tp, dia, hora]) => { const tc = TIPOS_CULTO[tp]; return `<div class="hor"><span class="cc-ic" style="--c1:${tc.cor};--c2:${tc.cor2}">${ic(tc.ic)}</span><span class="info"><b>${tp === 'celebracao' ? 'Culto da noite' : esc(tc.nome)}</b><small>${dia}</small></span><span class="when">${hora.split(' (')[0]}<small>${hora.includes('(') ? 'conforme escala' : ''}</small></span></div>`; }).join('')}
    </div>
    <div class="card">${cardH('music', `Escala dos domingos · ${MESES[m]}`, '#f97316', '#ec4899', `<small>${doms.length} domingos</small>`)}
      <div class="list">${doms.map((c, i) => `<button class="li" data-act="abrirCulto" data-key="${c.key}">${dbox(c.data, c.cor, c.cor2)}<span class="info"><b>${i + 1}º domingo · ${esc(c.nome)}</b><small>19:30 às 21:00</small></span>${db.cultos[c.key] ? pill('Registrado', '#10b981') : ''}</button>`).join('')}</div>
      <div class="note info" style="margin-top:12px">${ic('info')}<span>1º Senhoras · 2º Senhores · 3º Celebração · 4º Ceia. Mês com 5 domingos: Celebração no 3º e no 4º, Ceia no 5º.</span></div>
    </div>
  </div>`;
}

function abrirCulto(key) {
  const c = cultoPorKey(key); if (!c) return;
  const r = db.cultos[key] || {}, d = parse(c.data), ro = !edita('cultos');
  const pregadores = db.membros.filter(mb => OBREIROS.includes(mb.cargo)).map(mb => mb.nome);
  const ents = db.entradas.filter(e => e.cultoKey === key);
  const fin = pode('financeiro') ? `<div><div class="sec-t">${ic('wallet')} Dízimos e ofertas deste culto</div>${ents.length ? `<div class="table-wrap"><table><thead><tr><th>Tipo</th><th>Nome</th><th class="num">Valor</th></tr></thead><tbody>${ents.map(e => `<tr><td>${pill(e.tipo, COR_ENTRADA[e.tipo] || '#64748b')}</td><td>${esc(e.nome || '—')}</td><td class="num">${brl(e.valor)}</td></tr>`).join('')}</tbody><tfoot><tr><td colspan="2">Total arrecadado</td><td class="num">${brl(soma(ents))}</td></tr></tfoot></table></div>` : '<p class="muted">Nenhum lançamento vinculado a este culto.</p>'}</div>` : '';
  const [st, stTxt] = statusCulto(c);
  abrirModal({
    titulo: 'Culto',
    corpo: `
      <div class="culto-head" style="--c1:${c.cor};--c2:${c.cor2}"><span class="cc-ic">${ic(c.ic)}</span><div style="flex:1"><b>${esc(c.nome)}</b><small>${DIAS[d.getDay()]}, ${fmtData(c.data)} · ${c.inicio} às ${c.fim}</small></div><span class="cc-st ${st === 'today' ? '' : st}" style="background:rgba(255,255,255,.2);color:#fff">${esc(stTxt)}</span></div>
      <fieldset class="fs" ${ro ? 'disabled' : ''}><div class="form-grid">
        ${campo('Dirigente', inp('dirigente', r.dirigente, 'text', 'list="lstPreg"'))}
        ${campo('Pregador / Preletor', inp('pregador', r.pregador, 'text', 'list="lstPreg"'))}
        ${campo('Tema / Texto bíblico', inp('tema', r.tema, 'text', 'placeholder="Ex.: João 3:16"'), 'full')}
        ${campo('Presentes', inp('presentes', r.presentes, 'number', 'min="0" inputmode="numeric"'))}
        ${campo('Visitantes', inp('visitantes', r.visitantes, 'number', 'min="0" inputmode="numeric"'))}
        ${campo('Observações', txt('obs', r.obs), 'full')}
      </div></fieldset>
      <datalist id="lstPreg">${pregadores.map(p => `<option value="${esc(p)}">`).join('')}</datalist>
      ${fin}`,
    rodape: ro ? `<button type="button" class="btn" data-close>Fechar</button>` : `
      ${db.cultos[key] ? `<button type="button" class="btn danger" data-mact="limpar">${ic('trash')} Limpar</button>` : ''}
      ${edita('financeiro') ? `<button type="button" class="btn" data-mact="lancar">${ic('plus')} Lançar oferta/dízimo</button>` : ''}
      <span class="sp"></span><button type="button" class="btn" data-close>Fechar</button>
      <button type="submit" class="btn primary">${ic('check')} Salvar registro</button>`,
    aoSalvar: dados => { salvarCulto(key, dados); registrar('Registrou culto', `${c.nome} ${fmtDM(c.data)}`); salvar(); toast('Registro do culto salvo.', 'ok'); render(); },
    acoes: {
      lancar: dados => { salvarCulto(key, dados, true); salvar(); abrirEntrada(null, { data: c.data, cultoKey: key, tipo: 'Oferta' }); },
      limpar: () => { if (confirm('Apagar o registro deste culto?')) { delete db.cultos[key]; registrar('Limpou registro de culto', `${c.nome} ${fmtDM(c.data)}`); salvar(); fecharModal(); render(); toast('Registro removido.', 'ok'); } },
    },
  });
}
function salvarCulto(key, d, silencioso) {
  const reg = { dirigente: (d.dirigente || '').trim(), pregador: (d.pregador || '').trim(), tema: (d.tema || '').trim(), presentes: d.presentes === '' || d.presentes == null ? '' : Number(d.presentes), visitantes: d.visitantes === '' || d.visitantes == null ? '' : Number(d.visitantes), obs: (d.obs || '').trim() };
  if (Object.values(reg).some(v => v !== '')) db.cultos[key] = reg; else if (!silencioso) delete db.cultos[key];
}

/* =====================================================================
   DÍZIMOS E OFERTAS
   ===================================================================== */
function vFinanceiro() {
  const r = resumoMes(ui.y, ui.m), ant = new Date(ui.y, ui.m - 1, 1), ra = resumoMes(ant.getFullYear(), ant.getMonth());
  const diz = r.e.filter(e => e.tipo === 'Dízimo'), dizimistas = new Set(diz.map(e => e.membroId || e.nome)).size;
  const of = soma(r.e.filter(e => e.tipo === 'Oferta')), outras = r.tot - r.diz - of;
  const porTipo = TIPOS_ENTRADA.map(t => [t, soma(r.e.filter(e => e.tipo === t))]).filter(p => p[1] > 0);
  const porForma = FORMAS.map(f => [f, soma(r.e.filter(e => e.forma === f))]).filter(p => p[1] > 0);
  return `
  <div class="toolbar no-print">${navMes()}<span class="sp"></span>
    <button class="btn" data-act="exportarCSV">${ic('download')} Exportar CSV</button>
    ${edita('financeiro') ? `<button class="btn primary" data-act="novaEntrada">${ic('plus')} Novo lançamento</button>` : ''}
  </div>
  <div class="grid g4">
    ${kpi({ ic: 'heart', c1: '#8b5cf6', c2: '#6366f1', label: 'Dízimos', valor: r.diz, delta: pctDelta(r.diz, ra.diz), sub: `${dizimistas} dizimista(s)` })}
    ${kpi({ ic: 'gift', c1: '#06b6d4', c2: '#3b82f6', label: 'Ofertas', valor: of, sub: `${r.e.filter(e => e.tipo === 'Oferta').length} lançamentos` })}
    ${kpi({ ic: 'sparkles', c1: '#ec4899', c2: '#f97316', label: 'Outras entradas', valor: outras, sub: 'Missões, votos, campanhas' })}
    ${kpi({ ic: 'wallet', c1: '#10b981', c2: '#14b8a6', label: 'Total do mês', valor: r.tot, delta: pctDelta(r.tot, ra.tot), sub: `${r.e.length} lançamentos` })}
  </div>
  <div class="grid g21">
    <div class="card">
      <div class="toolbar no-print" style="margin-bottom:14px">
        ${sel('ftipo', [['', 'Todos os tipos'], ...TIPOS_ENTRADA], ui.f.tipo, 'data-filter="tipo" aria-label="Filtrar por tipo"')}
        <input type="search" placeholder="Buscar por nome…" value="${esc(ui.f.busca)}" data-filter="busca" aria-label="Buscar">
      </div>
      <div id="part">${tabEntradas()}</div>
    </div>
    <div class="col">
      <div class="card">${cardH('chart', 'Por tipo', '#8b5cf6', '#ec4899')}${donut(porTipo, porTipo.map(p => COR_ENTRADA[p[0]]), brlCurto(r.tot), 'total')}</div>
      <div class="card">${cardH('wallet', 'Por forma de pagamento', '#06b6d4', '#10b981')}${donut(porForma, porForma.map(p => COR_FORMA[p[0]]), String(r.e.length), 'lançamentos')}</div>
    </div>
  </div>`;
}
function tabEntradas() {
  const q = norm(ui.f.busca), ed = edita('financeiro');
  const rows = noMes(db.entradas, ui.y, ui.m).filter(e => (!ui.f.tipo || e.tipo === ui.f.tipo) && (!q || norm(e.nome).includes(q))).sort((a, b) => b.data.localeCompare(a.data));
  if (!rows.length) return vazioHtml('wallet', `Nenhum lançamento em ${MESES[ui.m]} de ${ui.y}.`, ed ? `<button class="btn primary sm" data-act="novaEntrada">${ic('plus')} Lançar agora</button>` : '');
  return `<div class="table-wrap"><table>
    <thead><tr><th>Data</th><th>Nome</th><th>Tipo</th><th>Culto</th><th class="num">Valor</th><th></th></tr></thead>
    <tbody>${rows.map(e => { const c = cultoPorKey(e.cultoKey); return `<tr>
      <td><b>${fmtDM(e.data)}</b><small>${DIAS_C[parse(e.data).getDay()]}</small></td>
      <td><div class="who-cell">${avatar(e.nome || 'Anônimo')}<div><b>${esc(e.nome || 'Anônimo')}</b><small>${esc(e.forma)}</small></div></div></td>
      <td>${pill(e.tipo, COR_ENTRADA[e.tipo] || '#64748b')}</td>
      <td>${c ? `<span class="pill" style="--p:${c.cor}"><i></i>${esc(c.curto)}</span>` : '<span class="muted">—</span>'}</td>
      <td class="num"><b>${brl(e.valor)}</b></td>
      <td class="actions">
        <button class="btn ico" data-act="recibo" data-id="${e.id}" data-tip="Imprimir recibo" aria-label="Recibo">${ic('printer')}</button>
        ${ed ? `<button class="btn ico" data-act="editarEntrada" data-id="${e.id}" data-tip="Editar" aria-label="Editar">${ic('edit')}</button><button class="btn ico danger" data-act="excluirEntrada" data-id="${e.id}" data-tip="Excluir" aria-label="Excluir">${ic('trash')}</button>` : ''}
      </td></tr>`; }).join('')}</tbody>
    <tfoot><tr><td colspan="4">Total ${ui.f.tipo || ui.f.busca ? 'filtrado' : 'do mês'}</td><td class="num">${brl(soma(rows))}</td><td></td></tr></tfoot>
  </table></div>`;
}
function opcoesCultos(ds, selecionado) {
  const lista = ds ? cultosDoDia(parse(ds)) : [];
  return `<option value="">— Sem vínculo com culto —</option>` + lista.map(c => `<option value="${c.key}" ${c.key === selecionado ? 'selected' : ''}>${esc(c.nome)} (${c.inicio})</option>`).join('');
}
function abrirEntrada(id, pre = {}) {
  if (!edita('financeiro')) return;
  const e = id ? db.entradas.find(x => x.id === id) : { data: iso(hoje()), tipo: 'Dízimo', forma: 'Dinheiro', ...pre };
  if (!e) return;
  const membros = db.membros.filter(mb => mb.ativo !== false || mb.id === e.membroId).sort((a, b) => a.nome.localeCompare(b.nome));
  abrirModal({
    titulo: id ? 'Editar lançamento' : 'Novo lançamento de entrada',
    corpo: `<div class="form-grid">
      ${campo('Data *', inp('data', e.data, 'date', 'required'))}
      ${campo('Tipo *', sel('tipo', TIPOS_ENTRADA, e.tipo))}
      ${campo('Membro', sel('membroId', [['', '— Não membro / anônimo —'], ...membros.map(mb => [mb.id, mb.nome])], e.membroId))}
      ${campo('Nome (se não for membro)', inp('nomeLivre', e.membroId ? '' : (e.nome || ''), 'text', 'placeholder="Ex.: Visitante, Anônimo…"'))}
      ${campo('Valor (R$) *', inp('valor', e.valor ?? '', 'number', 'required min="0.01" step="0.01" inputmode="decimal" placeholder="0,00"'))}
      ${campo('Forma de pagamento', sel('forma', FORMAS, e.forma))}
      ${campo('Culto', `<select name="cultoKey">${opcoesCultos(e.data, e.cultoKey)}</select>`, 'full')}
      ${campo('Observação', inp('obs', e.obs || ''), 'full')}
    </div>`,
    aoAbrir: f => {
      f.data.addEventListener('change', () => { f.cultoKey.innerHTML = opcoesCultos(f.data.value, ''); });
      f.membroId.addEventListener('change', () => { if (f.membroId.value) f.nomeLivre.value = ''; });
      if (!id && !e.cultoKey && e.data) { const cs = cultosDoDia(parse(e.data)); if (cs.length) f.cultoKey.value = cs[cs.length - 1].key; }
      f.valor.focus();
    },
    aoSalvar: d => {
      const valor = Number(d.valor);
      if (!(valor > 0)) { toast('Informe um valor maior que zero.', 'warn'); return false; }
      const mb = db.membros.find(x => x.id === d.membroId);
      const reg = { id: id || uid(), data: d.data, tipo: d.tipo, membroId: d.membroId || '', nome: mb ? mb.nome : (d.nomeLivre.trim() || 'Anônimo'), valor: Math.round(valor * 100) / 100, forma: d.forma, cultoKey: d.cultoKey || '', obs: d.obs.trim() };
      if (id) db.entradas[db.entradas.findIndex(x => x.id === id)] = reg; else db.entradas.push(reg);
      registrar(id ? 'Editou lançamento' : 'Lançou entrada', `${reg.tipo} ${brl(reg.valor)} · ${reg.nome}`);
      salvar(); toast(id ? 'Lançamento atualizado.' : `${reg.tipo} de ${brl(reg.valor)} lançado.`, 'ok');
      if (rotaAtual === 'financeiro') { const [yy, mm] = reg.data.split('-').map(Number); ui.y = yy; ui.m = mm - 1; }
      render();
    },
  });
}
function recibo(id) {
  const e = db.entradas.find(x => x.id === id); if (!e) return;
  const g = IG(), logo = new URL('img/logo.png', location.href).href;
  imprimirHtml(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Recibo</title>
  <style>body{font-family:Segoe UI,Arial,sans-serif;margin:30px;color:#111}.r{border:2px solid #111;border-radius:12px;padding:26px;max-width:640px;margin:auto}
  .h{display:flex;gap:16px;align-items:center;border-bottom:1px solid #999;padding-bottom:12px}.h img{width:90px}.h b{font-size:18px}
  .v{font-size:28px;font-weight:800;margin:18px 0}.a{margin-top:56px;text-align:center}.a div{border-top:1px solid #111;width:280px;margin:0 auto;padding-top:4px}small{color:#555}</style></head>
  <body><div class="r"><div class="h"><img src="${logo}" alt=""><div><b>${esc(g.nome)}</b><br>${esc(g.extensao)} · Desde ${esc(g.desde)}<br><small>${esc(enderecoCompleto())}</small></div></div>
  <h2 style="text-align:center;letter-spacing:.1em">RECIBO DE ${esc(e.tipo.toUpperCase())}</h2>
  <div class="v">${brl(e.valor)}</div>
  <p>Recebemos de <b>${esc(e.nome || 'Anônimo')}</b> a importância de <b>${brl(e.valor)}</b>, referente a <b>${esc(e.tipo)}</b>${e.cultoKey ? ` no ${esc(nomeCulto(e.cultoKey))}` : ''}, em ${fmtData(e.data)}, via ${esc(e.forma)}.</p>
  ${e.obs ? `<p><small>Obs.: ${esc(e.obs)}</small></p>` : ''}
  <p><i>"Cada um contribua segundo propôs no seu coração; não com tristeza, ou por necessidade; porque Deus ama ao que dá com alegria." – 2 Coríntios 9:7</i></p>
  <div class="a"><div>Tesouraria${usuario ? ' · ' + esc(usuario.nome) : ''}</div></div></div></body></html>`);
}

/* =====================================================================
   DESPESAS
   ===================================================================== */
function vDespesas() {
  const r = resumoMes(ui.y, ui.m), ant = new Date(ui.y, ui.m - 1, 1), ra = resumoMes(ant.getFullYear(), ant.getMonth());
  const porCat = CAT_DESPESA.map(c => [c, soma(r.d.filter(d => d.categoria === c))]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]);
  return `
  <div class="toolbar no-print">${navMes()}<span class="sp"></span>${edita('despesas') ? `<button class="btn primary" data-act="novaDespesa">${ic('plus')} Nova despesa</button>` : ''}</div>
  <div class="grid g3">
    ${kpi({ ic: 'receipt', c1: '#f43f5e', c2: '#f97316', label: 'Despesas do mês', valor: r.des, delta: pctDelta(r.des, ra.des), inverso: true, sub: `${r.d.length} lançamentos` })}
    ${kpi({ ic: 'trendUp', c1: '#10b981', c2: '#14b8a6', label: 'Entradas do mês', valor: r.tot, sub: 'dízimos + ofertas' })}
    ${kpi({ ic: 'wallet', c1: '#8b5cf6', c2: '#06b6d4', label: 'Resultado do mês', valor: r.saldo, sub: r.saldo >= 0 ? 'Saldo positivo' : 'Atenção: saldo negativo' })}
  </div>
  <div class="grid g21">
    <div class="card">
      <div class="toolbar no-print" style="margin-bottom:14px">${sel('fcat', [['', 'Todas as categorias'], ...CAT_DESPESA], ui.f.cat, 'data-filter="cat" aria-label="Filtrar categoria"')}</div>
      <div id="part">${tabDespesas()}</div>
    </div>
    <div class="card">${cardH('chart', 'Por categoria', '#f43f5e', '#f97316')}${donut(porCat, porCat.map((p, i) => PALETA[(i + 7) % PALETA.length]), brlCurto(r.des), 'gastos')}</div>
  </div>`;
}
function tabDespesas() {
  const ed = edita('despesas');
  const rows = noMes(db.despesas, ui.y, ui.m).filter(d => !ui.f.cat || d.categoria === ui.f.cat).sort((a, b) => b.data.localeCompare(a.data));
  if (!rows.length) return vazioHtml('receipt', `Nenhuma despesa em ${MESES[ui.m]} de ${ui.y}.`);
  return `<div class="table-wrap"><table>
    <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th class="num">Valor</th><th></th></tr></thead>
    <tbody>${rows.map(d => `<tr><td><b>${fmtDM(d.data)}</b><small>${DIAS_C[parse(d.data).getDay()]}</small></td><td><b>${esc(d.descricao)}</b><small>${esc(d.forma)}</small></td><td>${pill(d.categoria, corDe(d.categoria))}</td><td class="num"><b>${brl(d.valor)}</b></td>
      <td class="actions">${ed ? `<button class="btn ico" data-act="editarDespesa" data-id="${d.id}" data-tip="Editar" aria-label="Editar">${ic('edit')}</button><button class="btn ico danger" data-act="excluirDespesa" data-id="${d.id}" data-tip="Excluir" aria-label="Excluir">${ic('trash')}</button>` : ''}</td></tr>`).join('')}</tbody>
    <tfoot><tr><td colspan="3">Total</td><td class="num">${brl(soma(rows))}</td><td></td></tr></tfoot></table></div>`;
}
function abrirDespesa(id) {
  if (!edita('despesas')) return;
  const d = id ? db.despesas.find(x => x.id === id) : { data: iso(hoje()), categoria: 'Energia', forma: 'Dinheiro' };
  if (!d) return;
  abrirModal({
    titulo: id ? 'Editar despesa' : 'Nova despesa',
    corpo: `<div class="form-grid">
      ${campo('Data *', inp('data', d.data, 'date', 'required'))}
      ${campo('Categoria', sel('categoria', CAT_DESPESA, d.categoria))}
      ${campo('Descrição *', inp('descricao', d.descricao || '', 'text', 'required placeholder="Ex.: Conta de energia – outubro"'), 'full')}
      ${campo('Valor (R$) *', inp('valor', d.valor ?? '', 'number', 'required min="0.01" step="0.01" inputmode="decimal"'))}
      ${campo('Forma de pagamento', sel('forma', FORMAS, d.forma))}
    </div>`,
    aoSalvar: f => {
      const valor = Number(f.valor); if (!(valor > 0)) { toast('Informe um valor maior que zero.', 'warn'); return false; }
      const reg = { id: id || uid(), data: f.data, categoria: f.categoria, descricao: f.descricao.trim(), valor: Math.round(valor * 100) / 100, forma: f.forma };
      if (id) db.despesas[db.despesas.findIndex(x => x.id === id)] = reg; else db.despesas.push(reg);
      registrar(id ? 'Editou despesa' : 'Lançou despesa', `${reg.descricao} ${brl(reg.valor)}`);
      salvar(); toast('Despesa salva.', 'ok'); render();
    },
  });
}

/* =====================================================================
   MEMBROS
   ===================================================================== */
function vMembros() {
  const ativos = db.membros.filter(mb => mb.ativo !== false);
  const modo = prefs.membros === 'lista' ? 'lista' : 'cards';
  return `
  <div class="toolbar no-print">
    <input type="search" placeholder="Buscar por nome, telefone ou cargo…" value="${esc(ui.f.mbusca)}" data-filter="mbusca" aria-label="Buscar membro">
    <div class="seg-c"><button class="${modo === 'cards' ? 'on' : ''}" data-act="membrosModo" data-v="cards">${ic('grid')} Cartões</button><button class="${modo === 'lista' ? 'on' : ''}" data-act="membrosModo" data-v="lista">${ic('list')} Lista</button></div>
    <span class="sp"></span>${edita('membros') ? `<button class="btn primary" data-act="novoMembro">${ic('plus')} Novo membro</button>` : ''}
  </div>
  <div class="grid g4">
    ${kpi({ ic: 'users', c1: '#8b5cf6', c2: '#6366f1', label: 'Membros ativos', valor: ativos.length, fmt: 'int', sub: `${db.membros.length - ativos.length} inativo(s)` })}
    ${kpi({ ic: 'cake', c1: '#f59e0b', c2: '#ec4899', label: `Aniversariantes · ${MESES_C[hoje().getMonth()]}`, valor: ativos.filter(mb => mb.nascimento && parse(mb.nascimento).getMonth() === hoje().getMonth()).length, fmt: 'int', sub: 'neste mês' })}
    ${kpi({ ic: 'shield', c1: '#06b6d4', c2: '#3b82f6', label: 'Obreiros', valor: ativos.filter(mb => OBREIROS.includes(mb.cargo)).length, fmt: 'int', sub: 'com cargo ministerial' })}
    ${kpi({ ic: 'sparkles', c1: '#10b981', c2: '#14b8a6', label: 'Batizados', valor: ativos.filter(mb => mb.batismo).length, fmt: 'int', sub: 'nas águas' })}
  </div>
  <div class="seg-c no-print">${[['', 'Todos'], ...DEPTOS.map(d => [d, d])].map(([v, l]) => `<button class="${ui.f.depto === v ? 'on' : ''}" data-act="filtroDepto" data-v="${esc(v)}">${v ? `<i class="dot" style="background:${COR_DEPTO[v]};width:8px;height:8px"></i>` : ''}${l} <small>${v ? ativos.filter(mb => mb.departamento === v).length : ativos.length}</small></button>`).join('')}</div>
  <div id="part">${tabMembros()}</div>`;
}
function filtrarMembros() {
  const q = norm(ui.f.mbusca);
  return db.membros.filter(mb => (!ui.f.depto || mb.departamento === ui.f.depto) && (!q || norm(`${mb.nome} ${mb.telefone} ${mb.cargo}`).includes(q))).sort((a, b) => a.nome.localeCompare(b.nome));
}
const idade = ds => { if (!ds) return null; const n = parse(ds), t = hoje(); let a = t.getFullYear() - n.getFullYear(); if (t.getMonth() < n.getMonth() || (t.getMonth() === n.getMonth() && t.getDate() < n.getDate())) a--; return a; };
const anosDesde = ds => { const a = idade(ds); return a === null ? null : Math.max(0, a); };
function diasProxAniv(ds) {
  if (!ds) return null;
  const n = parse(ds), t = hoje();
  let p = new Date(t.getFullYear(), n.getMonth(), n.getDate());
  if (p < t) p = new Date(t.getFullYear() + 1, n.getMonth(), n.getDate());
  return Math.round((p - t) / 86400000);
}
function tabMembros() {
  const ano = String(hoje().getFullYear()), ed = edita('membros'), fin = pode('financeiro');
  const rows = filtrarMembros();
  if (!rows.length) return `<div class="card">${vazioHtml('users', 'Nenhum membro encontrado.', ed ? `<button class="btn primary sm" data-act="novoMembro">${ic('plus')} Cadastrar membro</button>` : '')}</div>`;
  if (prefs.membros !== 'lista') {
    return `<div class="mb-grid">${rows.map(mb => {
      const c1 = COR_DEPTO[mb.departamento] || corDe(mb.nome), dd = diasProxAniv(mb.nascimento), id = idade(mb.nascimento);
      return `<a class="mbc" href="#membro/${mb.id}" style="--c1:${c1};--c2:${PALETA[(PALETA.indexOf(corDe(mb.cargo || 'x')) + 2) % PALETA.length]}">
        <span class="mbc-cover"></span>
        ${avatar(mb.nome, 'xl', mb.foto)}
        <b>${esc(mb.nome)}</b>
        <span class="mbc-cargo">${esc(mb.cargo || 'Membro')}${mb.departamento ? ' · ' + esc(mb.departamento) : ''}</span>
        <span class="mbc-tags">${mb.ativo !== false ? pill('Ativo', '#10b981') : pill('Inativo', '#64748b')}${dd === 0 ? pill('Aniversário hoje 🎂', '#ec4899') : dd !== null && dd <= 7 ? pill(`Aniversário em ${dd}d`, '#f59e0b') : ''}</span>
        <span class="mbc-foot"><span>${ic('cake')} ${id !== null ? id + ' anos' : '—'}</span><span>${ic('phone')} ${esc(mb.telefone || '—')}</span></span>
      </a>`;
    }).join('')}</div>`;
  }
  return `<div class="card"><div class="table-wrap"><table>
    <thead><tr><th>Membro</th><th>Departamento</th><th>Contato</th><th>Aniversário</th><th>Situação</th>${fin ? `<th class="num">Dízimos ${ano}</th>` : ''}<th></th></tr></thead>
    <tbody>${rows.map(mb => {
      const zap = linkZap(mb.telefone);
      const diz = fin ? soma(db.entradas.filter(e => e.membroId === mb.id && e.tipo === 'Dízimo' && e.data.startsWith(ano))) : 0;
      return `<tr><td><a class="who-cell" href="#membro/${mb.id}" style="color:inherit">${avatar(mb.nome, '', mb.foto)}<div><b>${esc(mb.nome)}</b><small>${esc(mb.cargo)}</small></div></a></td>
      <td>${mb.departamento ? pill(mb.departamento, COR_DEPTO[mb.departamento] || '#64748b') : '<span class="muted">—</span>'}</td>
      <td>${mb.telefone ? `${esc(mb.telefone)}${zap ? ` <a href="${zap}" target="_blank" rel="noopener" data-tip="Abrir WhatsApp" aria-label="WhatsApp" style="display:inline-flex;vertical-align:middle">${ic('msg')}</a>` : ''}` : '<span class="muted">—</span>'}</td>
      <td>${fmtDM(mb.nascimento) || '<span class="muted">—</span>'}</td>
      <td>${mb.ativo !== false ? pill('Ativo', '#10b981') : pill('Inativo', '#64748b')}</td>
      ${fin ? `<td class="num">${diz ? brl(diz) : '<span class="muted">—</span>'}</td>` : ''}
      <td class="actions"><a class="btn ico" href="#membro/${mb.id}" data-tip="Ver perfil" aria-label="Ver perfil">${ic('user')}</a>${ed ? `<button class="btn ico" data-act="editarMembro" data-id="${mb.id}" data-tip="Editar" aria-label="Editar">${ic('edit')}</button><button class="btn ico danger" data-act="excluirMembro" data-id="${mb.id}" data-tip="Excluir" aria-label="Excluir">${ic('trash')}</button>` : ''}</td></tr>`;
    }).join('')}</tbody></table></div></div>`;
}

/* ---------- Perfil do membro ---------- */
function vPerfil(id) {
  const mb = db.membros.find(x => x.id === id);
  if (!mb) return `<div class="card">${vazioHtml('user', db.membros.length ? 'Membro não encontrado.' : 'Carregando…', '<a class="btn sm" href="#membros">Voltar</a>')}</div>`;
  const c1 = COR_DEPTO[mb.departamento] || corDe(mb.nome), c2 = PALETA[(PALETA.indexOf(c1) + 1) % PALETA.length];
  const id_ = idade(mb.nascimento), tempo = anosDesde(mb.desde), batAnos = anosDesde(mb.batismo), dd = diasProxAniv(mb.nascimento);
  const zap = linkZap(mb.telefone), fin = pode('financeiro'), ed = edita('membros');
  const meu = usuario && usuario.membroId === mb.id;
  const linha = (icone, rot, val) => `<div class="pf-row"><span class="pf-ic">${ic(icone)}</span><span><small>${rot}</small><b>${val ? esc(val) : '<span class="muted">Não informado</span>'}</b></span></div>`;

  // Linha do tempo da vida cristã
  const marcos = [
    [mb.nascimento, 'cake', 'Nascimento', id_ !== null ? `${id_} anos de idade` : '', '#f59e0b'],
    [mb.conversao, 'heart', 'Conversão', '', '#ec4899'],
    [mb.batismo, 'sparkles', 'Batismo nas águas', batAnos !== null ? `há ${batAnos} ano(s)` : '', '#06b6d4'],
    [mb.batismoES, 'flame', 'Batismo no Espírito Santo', '', '#f97316'],
    [mb.desde, 'church', 'Membro da igreja', tempo !== null ? `há ${tempo} ano(s)` : '', '#8b5cf6'],
  ].filter(m => m[0]).sort((a, b) => a[0].localeCompare(b[0]));

  // Participação nos cultos
  const part = Object.entries(db.cultos).filter(([, r]) => r && (r.pregador === mb.nome || r.dirigente === mb.nome)).map(([k, r]) => ({ c: cultoPorKey(k), r })).filter(x => x.c).sort((a, b) => b.c.data.localeCompare(a.c.data));
  const pregou = part.filter(x => x.r.pregador === mb.nome).length, dirigiu = part.filter(x => x.r.dirigente === mb.nome).length;

  // Contribuições
  let contrib = '';
  if (fin) {
    const t = hoje(), doze = mesesAtras(12, t.getFullYear(), t.getMonth());
    const minhas = db.entradas.filter(e => e.membroId === mb.id).sort((a, b) => b.data.localeCompare(a.data));
    const serie = doze.map(x => soma(minhas.filter(e => e.tipo === 'Dízimo' && e.data.startsWith(prefixoMes(x.y, x.m)))));
    const ano = soma(minhas.filter(e => e.tipo === 'Dízimo' && e.data.startsWith(String(t.getFullYear()))));
    const mesesFieis = serie.filter(v => v > 0).length;
    contrib = `<div class="card">${cardH('heart', 'Dízimos e ofertas', '#8b5cf6', '#ec4899', `<small>${mesesFieis} de 12 meses</small>`)}
      <div class="pf-mini">
        <div><small>Dízimos em ${t.getFullYear()}</small><b>${brl(ano)}</b></div>
        <div><small>Média mensal (12m)</small><b>${brl(serie.reduce((s, v) => s + v, 0) / 12)}</b></div>
        <div><small>Último lançamento</small><b>${minhas[0] ? fmtData(minhas[0].data) : '—'}</b></div>
      </div>
      ${serie.some(v => v > 0) ? areaChart([{ nome: 'Dízimos', cor: '#8b5cf6', v: serie }], doze.map(x => MESES_C[x.m]), { h: 200, destaque: 11 }) : vazioHtml('heart', 'Nenhum dízimo registrado nos últimos 12 meses.')}
      ${minhas.length ? `<div class="table-wrap" style="margin-top:10px"><table><thead><tr><th>Data</th><th>Tipo</th><th>Forma</th><th class="num">Valor</th></tr></thead><tbody>${minhas.slice(0, 6).map(e => `<tr><td>${fmtData(e.data)}</td><td>${pill(e.tipo, COR_ENTRADA[e.tipo] || '#64748b')}</td><td>${esc(e.forma)}</td><td class="num"><b>${brl(e.valor)}</b></td></tr>`).join('')}</tbody></table></div>` : ''}
    </div>`;
  }

  return `
  <div class="toolbar no-print">
    ${pode('membros') ? `<a class="btn" href="#membros">${ic('left')} Membros</a>` : ''}
    <span class="sp"></span>
    <button class="btn" data-act="imprimirFicha" data-id="${mb.id}">${ic('printer')} Imprimir ficha</button>
    ${ed ? `<button class="btn primary" data-act="editarMembro" data-id="${mb.id}">${ic('edit')} Editar perfil</button>` : ''}
  </div>
  <section class="pf-hero" style="--c1:${c1};--c2:${c2}">
    <div class="pf-cover"><span></span><span></span></div>
    <div class="pf-main">
      <div class="pf-foto">${avatar(mb.nome, 'xxl', mb.foto)}${mb.ativo !== false ? '<i class="pf-on" data-tip="Membro ativo"></i>' : ''}</div>
      <div class="pf-id">
        <h2>${esc(mb.nome)}${meu ? ' <small class="pf-eu">Você</small>' : ''}</h2>
        <div class="pf-tags">${pill(mb.cargo || 'Membro', OBREIROS.includes(mb.cargo) ? '#f97316' : '#8b5cf6')}${mb.departamento ? pill(mb.departamento, COR_DEPTO[mb.departamento] || '#64748b') : ''}${mb.ativo !== false ? pill('Ativo', '#10b981') : pill('Inativo', '#64748b')}${mb.ministerios ? mb.ministerios.split(',').map(s => s.trim()).filter(Boolean).slice(0, 4).map(s => pill(s, corDe(s))).join('') : ''}</div>
        <p>${ic('church')} ${esc(IG().nome)} · ${esc(IG().extensao)}</p>
      </div>
      <div class="pf-act">
        ${zap ? `<a class="btn primary" href="${zap}" target="_blank" rel="noopener">${ic('msg')} WhatsApp</a>` : ''}
        ${mb.telefone ? `<a class="btn" href="tel:${esc(String(mb.telefone).replace(/[^\d+]/g, ''))}">${ic('phone')} Ligar</a>` : ''}
        ${mb.email ? `<a class="btn" href="mailto:${esc(mb.email)}">${ic('msg')} E-mail</a>` : ''}
      </div>
    </div>
    <div class="pf-stats">
      <div><b>${id_ !== null ? id_ : '—'}</b><small>anos de idade</small></div>
      <div><b>${tempo !== null ? tempo : '—'}</b><small>anos na igreja</small></div>
      <div><b>${batAnos !== null ? batAnos : '—'}</b><small>anos de batismo</small></div>
      <div><b>${dd === null ? '—' : dd === 0 ? '🎂' : dd}</b><small>${dd === 0 ? 'aniversário hoje!' : 'dias p/ aniversário'}</small></div>
      <div><b>${pregou + dirigiu}</b><small>cultos ministrados</small></div>
    </div>
  </section>
  <div class="grid g3">
    <div class="card">${cardH('user', 'Dados pessoais', c1, c2)}
      ${linha('calendar', 'Nascimento', mb.nascimento ? `${fmtData(mb.nascimento)}${id_ !== null ? ` · ${id_} anos` : ''}` : '')}
      ${linha('user', 'Sexo', mb.sexo)}
      ${linha('heart', 'Estado civil', mb.estadoCivil)}
      ${linha('users', 'Cônjuge', mb.conjuge)}
      ${linha('cap', 'Profissão', mb.profissao)}
    </div>
    <div class="card">${cardH('phone', 'Contato e endereço', '#10b981', '#06b6d4')}
      ${linha('phone', 'Telefone / WhatsApp', mb.telefone)}
      ${linha('msg', 'E-mail', mb.email)}
      ${linha('pin', 'Endereço', mb.endereco)}
      ${linha('shield', 'Cargo', mb.cargo)}
      ${linha('sparkles', 'Ministérios', mb.ministerios)}
    </div>
    <div class="card">${cardH('flame', 'Vida cristã', '#f97316', '#ec4899')}
      ${marcos.length ? `<div class="timeline">${marcos.map(([d, i, t, sub, cor]) => `<div class="tl-it" style="--c:${cor}"><span class="tl-dot">${ic(i)}</span><div><b>${t}</b><small>${fmtData(d)}${sub ? ' · ' + sub : ''}</small></div></div>`).join('')}</div>` : vazioHtml('flame', 'Sem datas registradas.')}
    </div>
  </div>
  <div class="grid ${fin ? 'g21' : 'g2'}">
    ${contrib || ''}
    <div class="col">
      <div class="card">${cardH('music', 'Participação nos cultos', '#6366f1', '#06b6d4', `<small>pregou ${pregou} · dirigiu ${dirigiu}</small>`)}
        ${part.length ? `<div class="list">${part.slice(0, 6).map(x => `<button class="li" data-act="abrirCulto" data-key="${x.c.key}">${dbox(x.c.data, x.c.cor, x.c.cor2)}<span class="info"><b>${esc(x.c.nome)}</b><small>${x.r.pregador === mb.nome ? 'Pregou' : 'Dirigiu'}${x.r.tema ? ' · ' + esc(x.r.tema) : ''}</small></span></button>`).join('')}</div>` : vazioHtml('music', 'Ainda não ministrou em cultos registrados.')}
      </div>
      <div class="card">${cardH('book', 'Observações', '#64748b', '#8b5cf6')}<p class="pf-obs">${mb.obs ? esc(mb.obs) : '<span class="muted">Nenhuma observação.</span>'}</p></div>
    </div>
  </div>`;
}
function fichaMembro(id) {
  const mb = db.membros.find(x => x.id === id); if (!mb) return;
  const g = IG(), logo = new URL('img/logo.png', location.href).href, l = (r, v) => `<tr><th>${r}</th><td>${esc(v || '—')}</td></tr>`;
  imprimirHtml(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Ficha</title><style>body{font-family:Segoe UI,Arial,sans-serif;margin:28px;color:#111}.h{display:flex;gap:16px;align-items:center;border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:16px}.h img{width:84px}.p{display:flex;gap:18px;align-items:center;margin-bottom:12px}.f{width:110px;height:110px;border-radius:14px;object-fit:cover;border:1px solid #ccc}table{width:100%;border-collapse:collapse}th{text-align:left;width:34%;color:#444;font-weight:600}th,td{padding:7px 8px;border-bottom:1px solid #ddd;font-size:14px}h2{margin:0}</style></head><body>
  <div class="h"><img src="${logo}" alt=""><div><b style="font-size:18px">${esc(g.nome)}</b><br>${esc(g.extensao)} · Ficha de membro<br><small>${esc(enderecoCompleto())}</small></div></div>
  <div class="p">${mb.foto ? `<img class="f" src="${esc(mb.foto)}" alt="">` : ''}<div><h2>${esc(mb.nome)}</h2><div>${esc(mb.cargo || 'Membro')}${mb.departamento ? ' · ' + esc(mb.departamento) : ''} · ${mb.ativo !== false ? 'Ativo' : 'Inativo'}</div></div></div>
  <table>${l('Data de nascimento', fmtData(mb.nascimento))}${l('Sexo', mb.sexo)}${l('Estado civil', mb.estadoCivil)}${l('Cônjuge', mb.conjuge)}${l('Profissão', mb.profissao)}${l('Telefone', mb.telefone)}${l('E-mail', mb.email)}${l('Endereço', mb.endereco)}${l('Conversão', fmtData(mb.conversao))}${l('Batismo nas águas', fmtData(mb.batismo))}${l('Batismo no Espírito Santo', fmtData(mb.batismoES))}${l('Membro desde', fmtData(mb.desde))}${l('Ministérios', mb.ministerios)}${l('Observações', mb.obs)}</table>
  <p style="margin-top:40px;text-align:center">_______________________________________<br>Secretaria</p></body></html>`);
}
function abrirMembro(id) {
  const mb = id ? db.membros.find(x => x.id === id) : { cargo: 'Membro', ativo: true, departamento: '' };
  if (!mb) return;
  if (!edita('membros')) { if (id) location.hash = '#membro/' + id; return; }
  abrirModal({
    titulo: id ? 'Editar perfil do membro' : 'Novo membro',
    largo: true,
    corpo: `
      <div class="foto-up">
        <span id="fotoPrev">${avatar(mb.nome || '?', 'xxl', mb.foto)}</span>
        <div><b>Foto do perfil</b><small>JPG ou PNG. A imagem é reduzida automaticamente.</small>
          <div class="toolbar" style="margin-top:8px"><label class="btn sm">${ic('upload')} Escolher foto<input type="file" accept="image/*" id="fotoFile" hidden></label><button type="button" class="btn sm danger" id="fotoDel">${ic('trash')} Remover</button></div></div>
        <input type="hidden" name="foto" value="${esc(mb.foto || '')}">
      </div>
      <div class="sec-t">${ic('user')} Dados pessoais</div>
      <div class="form-grid">
        ${campo('Nome completo *', inp('nome', mb.nome || '', 'text', 'required'), 'full')}
        ${campo('Data de nascimento', inp('nascimento', mb.nascimento || '', 'date'))}
        ${campo('Sexo', sel('sexo', ['', 'Masculino', 'Feminino'], mb.sexo || ''))}
        ${campo('Estado civil', sel('estadoCivil', ESTADO_CIVIL, mb.estadoCivil || ''))}
        ${campo('Cônjuge', inp('conjuge', mb.conjuge || '', 'text', 'list="lstMembros"'))}
        ${campo('Profissão', inp('profissao', mb.profissao || ''))}
        ${campo('Telefone / WhatsApp', inp('telefone', mb.telefone || '', 'tel', 'placeholder="(93) 9 0000-0000"'))}
        ${campo('E-mail', inp('email', mb.email || '', 'email'))}
        ${campo('Endereço', inp('endereco', mb.endereco || ''), 'full')}
      </div>
      <div class="sec-t">${ic('church')} Vida na igreja</div>
      <div class="form-grid">
        ${campo('Cargo', sel('cargo', CARGOS, mb.cargo))}
        ${campo('Departamento', sel('departamento', [['', '—'], ...DEPTOS], mb.departamento))}
        ${campo('Data de conversão', inp('conversao', mb.conversao || '', 'date'))}
        ${campo('Batismo nas águas', inp('batismo', mb.batismo || '', 'date'))}
        ${campo('Batismo no Espírito Santo', inp('batismoES', mb.batismoES || '', 'date'))}
        ${campo('Membro desde', inp('desde', mb.desde || '', 'date'))}
        ${campo('Ministérios (separe por vírgula)', inp('ministerios', mb.ministerios || '', 'text', 'placeholder="Ex.: Louvor, EBD, Recepção"'), 'full')}
        ${campo('Observações', txt('obs', mb.obs || ''), 'full')}
        <label class="switch full"><input type="checkbox" name="ativo" ${mb.ativo !== false ? 'checked' : ''}> Membro ativo</label>
      </div>
      <datalist id="lstMembros">${db.membros.filter(x => x.id !== id).map(x => `<option value="${esc(x.nome)}">`).join('')}</datalist>`,
    aoAbrir: f => {
      const atualizar = () => { $('#fotoPrev').innerHTML = avatar(f.nome.value || '?', 'xxl', f.foto.value); };
      $('#fotoFile').addEventListener('change', async ev => {
        const file = ev.target.files[0]; if (!file) return;
        try { f.foto.value = await reduzirFoto(file); atualizar(); } catch (e) { toast('Não foi possível ler esta imagem.', 'err'); }
      });
      $('#fotoDel').addEventListener('click', () => { f.foto.value = ''; atualizar(); });
      f.nome.addEventListener('input', atualizar);
    },
    aoSalvar: f => {
      const campos = ['nome', 'telefone', 'email', 'nascimento', 'sexo', 'estadoCivil', 'conjuge', 'profissao', 'cargo', 'departamento', 'conversao', 'batismo', 'batismoES', 'desde', 'ministerios', 'endereco', 'obs', 'foto'];
      const reg = { id: id || uid(), ativo: f.ativo === 'on' };
      campos.forEach(k => { reg[k] = String(f[k] ?? '').trim(); });
      if (!reg.nome) { toast('Informe o nome.', 'warn'); return false; }
      if (id) { db.membros[db.membros.findIndex(x => x.id === id)] = reg; db.entradas.forEach(e => { if (e.membroId === id) e.nome = reg.nome; }); }
      else db.membros.push(reg);
      registrar(id ? 'Editou membro' : 'Cadastrou membro', reg.nome);
      salvar(); toast('Perfil salvo.', 'ok');
      if (!id) location.hash = '#membro/' + reg.id; else render();
    },
  });
}

/* =====================================================================
   EVENTOS
   ===================================================================== */
function vEventos() {
  const h = iso(hoje());
  let evs = db.eventos.slice();
  if (ui.f.evt === 'proximos') evs = evs.filter(e => e.data >= h);
  if (ui.f.evt === 'passados') evs = evs.filter(e => e.data < h);
  evs.sort((a, b) => (a.data + (a.inicio || '')).localeCompare(b.data + (b.inicio || '')) * (ui.f.evt === 'passados' ? -1 : 1));
  return `
  <div class="toolbar no-print">
    <div class="seg-c">${[['proximos', 'Próximos'], ['passados', 'Passados'], ['todos', 'Todos']].map(([v, l]) => `<button class="${ui.f.evt === v ? 'on' : ''}" data-act="filtroEvt" data-v="${v}">${l}</button>`).join('')}</div>
    <span class="sp"></span>${edita('eventos') ? `<button class="btn primary" data-act="novoEvento">${ic('plus')} Novo evento</button>` : ''}
  </div>
  ${evs.length ? `<div class="ev-grid">${evs.map(e => {
    const d = parse(e.data), c1 = corDe(e.titulo), c2 = PALETA[(PALETA.indexOf(c1) + 1) % PALETA.length], dd = diasAte(e.data);
    const quando = dd < 0 ? pill(`há ${-dd} dia(s)`, '#64748b') : dd === 0 ? pill('Hoje', '#f43f5e') : dd === 1 ? pill('Amanhã', '#f97316') : pill(`em ${dd} dias`, c1);
    return `<button class="evc" style="--c1:${c1};--c2:${c2}" data-act="editarEvento" data-id="${e.id}">
      <span class="evc-date"><b>${pad(d.getDate())}</b><span>${MESES_C[d.getMonth()]}</span><small>${d.getFullYear()}</small></span>
      <span class="evc-body"><b>${esc(e.titulo)}</b>
        <small>${ic('clock')} ${DIAS[d.getDay()]}${e.inicio ? ' · ' + esc(e.inicio) + (e.fim ? ' às ' + esc(e.fim) : '') : ''}</small>
        ${e.local ? `<small>${ic('pin')} ${esc(e.local)}</small>` : ''}
        ${e.responsavel ? `<small>${ic('user')} ${esc(e.responsavel)}</small>` : ''}
        ${e.descricao ? `<p>${esc(e.descricao)}</p>` : ''}
        <span class="evc-when">${quando}</span></span>
    </button>`; }).join('')}</div>` : `<div class="card">${vazioHtml('sparkles', 'Nenhum evento por aqui.', edita('eventos') ? `<button class="btn primary sm" data-act="novoEvento">${ic('plus')} Criar evento</button>` : '')}</div>`}`;
}
function abrirEvento(id) {
  const e = id ? db.eventos.find(x => x.id === id) : { data: iso(hoje()), inicio: '19:30', local: 'Templo – ' + IG().cidade };
  if (!e) return;
  const ro = !edita('eventos');
  if (ro && !id) return;
  abrirModal({
    titulo: id ? (ro ? 'Evento' : 'Editar evento') : 'Novo evento',
    corpo: `<fieldset class="fs" ${ro ? 'disabled' : ''}><div class="form-grid">
      ${campo('Título *', inp('titulo', e.titulo || '', 'text', 'required placeholder="Ex.: Congresso de Jovens"'), 'full')}
      ${campo('Data *', inp('data', e.data, 'date', 'required'))}
      ${campo('Local', inp('local', e.local || ''))}
      ${campo('Início', inp('inicio', e.inicio || '', 'time'))}
      ${campo('Término', inp('fim', e.fim || '', 'time'))}
      ${campo('Responsável', inp('responsavel', e.responsavel || ''), 'full')}
      ${campo('Descrição', txt('descricao', e.descricao || ''), 'full')}
    </div></fieldset>`,
    rodape: ro ? '<button type="button" class="btn" data-close>Fechar</button>' : `${id ? `<button type="button" class="btn danger" data-mact="excluir">${ic('trash')} Excluir</button>` : ''}<span class="sp"></span><button type="button" class="btn" data-close>Cancelar</button><button type="submit" class="btn primary">${ic('check')} Salvar</button>`,
    acoes: { excluir: () => { if (confirm('Excluir este evento?')) { db.eventos = db.eventos.filter(x => x.id !== id); registrar('Excluiu evento', e.titulo); salvar(); fecharModal(); render(); toast('Evento excluído.', 'ok'); } } },
    aoSalvar: f => {
      const reg = { id: id || uid(), titulo: f.titulo.trim(), data: f.data, inicio: f.inicio, fim: f.fim, local: f.local.trim(), responsavel: f.responsavel.trim(), descricao: f.descricao.trim() };
      if (id) db.eventos[db.eventos.findIndex(x => x.id === id)] = reg; else db.eventos.push(reg);
      registrar(id ? 'Editou evento' : 'Criou evento', reg.titulo);
      salvar(); toast('Evento salvo.', 'ok'); render();
    },
  });
}

/* =====================================================================
   RELATÓRIOS
   ===================================================================== */
function vRelatorios() {
  const y = ui.y, m = ui.m, r = resumoMes(y, m), g = IG();
  const porTipo = TIPOS_ENTRADA.map(t => [t, soma(r.e.filter(e => e.tipo === t))]).filter(p => p[1] > 0);
  const porForma = FORMAS.map(f => [f, soma(r.e.filter(e => e.forma === f))]).filter(p => p[1] > 0);
  const porCat = CAT_DESPESA.map(c => [c, soma(r.d.filter(d => d.categoria === c))]).filter(p => p[1] > 0).sort((a, b) => b[1] - a[1]);
  const anual = MESES_C.map((_, i) => resumoMes(y, i));
  const hIso = iso(hoje());
  const cultos = cultosDoMes(y, m).filter(c => c.data <= hIso || db.cultos[c.key]).map(c => ({ ...c, r: db.cultos[c.key] || {}, arrec: soma(db.entradas.filter(e => e.cultoKey === c.key)) }));
  const comP = cultos.filter(c => c.r.presentes !== undefined && c.r.presentes !== '');
  const totP = comP.reduce((s, c) => s + Number(c.r.presentes), 0), totV = cultos.reduce((s, c) => s + (Number(c.r.visitantes) || 0), 0);
  const mapa = {};
  r.e.filter(e => e.tipo === 'Dízimo').forEach(e => { const k = e.nome || 'Anônimo'; mapa[k] = (mapa[k] || 0) + e.valor; });
  const dizimistas = Object.entries(mapa).sort((a, b) => a[0].localeCompare(b[0]));
  return `
  <div class="toolbar no-print">${navMes()}<span class="sp"></span><button class="btn primary" data-act="imprimir">${ic('printer')} Imprimir relatório</button></div>
  <div class="print-head"><img src="img/logo.png" alt=""><div><b style="font-size:18px">${esc(g.nome)} – ${esc(g.extensao)}</b><br>Relatório financeiro e de cultos · ${MESES[m]} de ${y}<br><small>${esc(enderecoCompleto())}</small></div></div>
  <div class="grid g4">
    ${kpi({ ic: 'trendUp', c1: '#10b981', c2: '#14b8a6', label: 'Entradas', valor: r.tot, sub: `${r.e.length} lançamentos` })}
    ${kpi({ ic: 'trendDown', c1: '#f43f5e', c2: '#f97316', label: 'Saídas', valor: r.des, sub: `${r.d.length} lançamentos` })}
    ${kpi({ ic: 'activity', c1: '#8b5cf6', c2: '#6366f1', label: 'Resultado do mês', valor: r.saldo, sub: r.saldo >= 0 ? 'positivo' : 'negativo' })}
    ${kpi({ ic: 'wallet', c1: '#06b6d4', c2: '#3b82f6', label: 'Saldo em caixa', valor: saldoAte(y, m), sub: `acumulado até ${MESES_C[m]}/${y}` })}
  </div>
  <div class="card">${cardH('chart', `Movimento de ${y}`, '#8b5cf6', '#06b6d4', `<span class="legend"><span><i style="background:#10b981"></i>Entradas</span><span><i style="background:#f43f5e"></i>Saídas</span></span>`)}
    ${areaChart([{ nome: 'Entradas', cor: '#10b981', v: anual.map(a => a.tot) }, { nome: 'Saídas', cor: '#f43f5e', v: anual.map(a => a.des) }], MESES_C, { destaque: m })}</div>
  <div class="grid g3">
    <div class="card">${cardH('gift', 'Entradas por tipo', '#8b5cf6', '#ec4899')}${donut(porTipo, porTipo.map(p => COR_ENTRADA[p[0]]), brlCurto(r.tot), 'entradas')}</div>
    <div class="card">${cardH('wallet', 'Por forma de pagamento', '#06b6d4', '#10b981')}${donut(porForma, porForma.map(p => COR_FORMA[p[0]]), String(r.e.length), 'lançamentos')}</div>
    <div class="card">${cardH('receipt', 'Despesas por categoria', '#f43f5e', '#f97316')}${donut(porCat, porCat.map((p, i) => PALETA[(i + 7) % PALETA.length]), brlCurto(r.des), 'saídas')}</div>
  </div>
  <div class="grid g21">
    <div class="card">${cardH('users', 'Frequência dos cultos', '#10b981', '#06b6d4', `<small>${comP.length} com presença · média ${comP.length ? Math.round(totP / comP.length) : 0} · ${totV} visitante(s)</small>`)}
      ${cultos.length ? `<div class="table-wrap"><table><thead><tr><th>Data</th><th>Culto</th><th>Pregador</th><th class="num">Pres.</th><th class="num">Visit.</th><th class="num">Arrecadado</th></tr></thead><tbody>
        ${cultos.map(c => `<tr><td>${fmtDM(c.data)}</td><td>${pill(c.curto, c.cor)}</td><td>${esc(c.r.pregador || '—')}</td><td class="num">${c.r.presentes ?? '—'}</td><td class="num">${c.r.visitantes ?? '—'}</td><td class="num">${c.arrec ? brl(c.arrec) : '—'}</td></tr>`).join('')}
      </tbody></table></div>` : vazioHtml('calendar', 'Sem cultos realizados neste mês.')}</div>
    <div class="card">${cardH('heart', `Dizimistas (${dizimistas.length})`, '#8b5cf6', '#6366f1')}
      ${dizimistas.length ? `<div class="table-wrap"><table><thead><tr><th>Nome</th><th class="num">Valor</th></tr></thead><tbody>${dizimistas.map(([n, v]) => `<tr><td><div class="who-cell">${avatar(n)}<b>${esc(n)}</b></div></td><td class="num">${brl(v)}</td></tr>`).join('')}</tbody><tfoot><tr><td>Total</td><td class="num">${brl(dizimistas.reduce((s, d) => s + d[1], 0))}</td></tr></tfoot></table></div>` : vazioHtml('heart', 'Nenhum dízimo neste mês.')}</div>
  </div>`;
}

/* =====================================================================
   A IGREJA
   ===================================================================== */
function vIgreja() {
  const g = IG(), zap = linkZap(g.telefone);
  const mapa = `https://maps.google.com/maps?q=${encodeURIComponent(enderecoBusca())}&z=16&output=embed`;
  const fixos = [['ebd', 'Domingo', '08:00 – 10:00'], ['senhoras', 'Domingo · 1º do mês', '19:30 – 21:00'], ['senhores', 'Domingo · 2º do mês', '19:30 – 21:00'], ['celebracao', 'Domingo · 3º (e 4º se houver 5)', '19:30 – 21:00'], ['ceia', 'Domingo · último do mês', '19:30 – 21:00'], ['treinamento', 'Quarta-feira', '19:30 – 21:00'], ['oracao', 'Sexta-feira', '19:30 – 21:00'], ['circulo', 'Sábado', '07:00 – 08:00']];
  return `
  <section class="ig-hero" style="background-image:url('img/igreja.jpg')">
    <div class="ig-in"><img src="img/logo.png" alt="Logo"><div><span class="eyebrow">${ic('church')} Desde ${esc(g.desde)} · ${hoje().getFullYear() - Number(g.desde)} anos</span><h2>${esc(g.nome)}</h2><p>${esc(g.extensao)}</p></div></div>
  </section>
  <div class="grid g4">
    <div class="card info-tile"><span class="ic-b" style="--c1:#8b5cf6;--c2:#06b6d4">${ic('pin')}</span><div><small>Endereço</small><b>${esc(g.endereco)}</b><span class="muted">${esc(g.bairro)}, ${esc(g.cidade)} – ${esc(g.uf)} · ${esc(g.cep)}</span></div></div>
    <div class="card info-tile"><span class="ic-b" style="--c1:#10b981;--c2:#14b8a6">${ic('phone')}</span><div><small>Telefone</small><b>${esc(g.telefone || '—')}</b>${zap ? `<a href="${zap}" target="_blank" rel="noopener">Abrir WhatsApp ↗</a>` : ''}</div></div>
    <div class="card info-tile"><span class="ic-b" style="--c1:#f97316;--c2:#ec4899">${ic('users')}</span><div><small>Pastor e pastora</small><b>${esc(g.pastor || 'Pastor: não informado')}</b><span class="muted">${esc(g.pastora ? 'Pastora ' + g.pastora : 'Pastora: não informada')}</span>${papel() === 'admin' ? '<br><a href="#admin" data-act="irAdminIgreja">Editar dados</a>' : ''}</div></div>
    <div class="card info-tile"><span class="ic-b" style="--c1:#f59e0b;--c2:#f97316">${ic('calendar')}</span><div><small>Fundação</small><b>${esc(g.desde)}</b><span class="muted">${esc(g.extensao)}</span></div></div>
  </div>
  <div class="grid g2">
    <div class="card">${cardH('clock', 'Horários de culto', '#8b5cf6', '#ec4899')}
      ${fixos.map(([tp, dia, hora]) => { const tc = TIPOS_CULTO[tp]; return `<div class="hor"><span class="cc-ic" style="--c1:${tc.cor};--c2:${tc.cor2}">${ic(tc.ic)}</span><span class="info"><b>${esc(tc.nome)}</b><small>${dia}</small></span><span class="when">${hora}</span></div>`; }).join('')}
    </div>
    <div class="card">${cardH('map', 'Localização', '#06b6d4', '#10b981', `<a class="btn sm" href="${linkMaps()}" target="_blank" rel="noopener">${ic('pin')} Como chegar</a>`)}
      <iframe class="map" src="${mapa}" loading="lazy" title="Mapa da igreja" referrerpolicy="no-referrer-when-downgrade"></iframe>
      <p class="muted" style="margin-top:10px;font-size:12.5px">${esc(enderecoCompleto())}</p>
    </div>
  </div>`;
}

/* =====================================================================
   CONFIGURAÇÕES (de cada usuário)
   ===================================================================== */
function vConfig() {
  const perm = 'Notification' in window ? Notification.permission : 'indisponivel';
  const permTxt = { granted: pill('Permitido', '#10b981'), denied: pill('Bloqueado no navegador', '#f43f5e'), default: pill('Ainda não permitido', '#f59e0b'), indisponivel: pill('Não suportado', '#64748b') }[perm];
  return `
  <div class="grid g2">
    <div class="card">${cardH('sun', 'Aparência', '#8b5cf6', '#06b6d4')}
      <div class="field"><span class="fl">Tema</span><div class="seg-c"><button class="${prefs.tema === 'dark' ? 'on' : ''}" data-act="tema" data-v="dark">${ic('moon')} Escuro</button><button class="${prefs.tema === 'light' ? 'on' : ''}" data-act="tema" data-v="light">${ic('sun')} Claro</button></div></div>
      <div class="field" style="margin-top:16px"><span class="fl">Menu lateral</span><div class="seg-c">${[['aberta', 'Expandido'], ['mini', 'Compacto'], ['oculta', 'Escondido']].map(([v, l]) => `<button class="${prefs.sidebar === v ? 'on' : ''}" data-act="sidebarModo" data-v="${v}">${l}</button>`).join('')}</div>
      <span class="hint" style="margin-top:6px">Dica: use o botão ${ic('sidebar')} no topo para esconder/mostrar o menu a qualquer momento.</span></div>
    </div>
    <form class="card" data-form="notif">${cardH('bell', 'Notificações da programação', '#ec4899', '#f97316')}
      <div style="display:flex;flex-direction:column;gap:14px">
        <label class="switch"><input type="checkbox" name="notifNav" ${prefs.notifNav ? 'checked' : ''}> Avisos do navegador (pop-up do Windows/celular)</label>
        <div class="hint">Status no navegador: ${permTxt}</div>
        ${campo('Avisar antes do culto/evento', sel('antecedencia', [[15, '15 minutos antes'], [30, '30 minutos antes'], [60, '1 hora antes'], [120, '2 horas antes'], [1440, '1 dia antes']], prefs.antecedencia))}
        <div class="note info">${ic('info')}<span>Os avisos aparecem enquanto o sistema estiver aberto em alguma aba. O sino ${ic('bell')} no topo mostra sempre os cultos de hoje e amanhã, eventos e aniversários.</span></div>
        <div class="form-actions" style="margin-top:0"><button type="button" class="btn" data-act="testarNotif">${ic('zap')} Testar aviso</button><button type="submit" class="btn primary">${ic('check')} Salvar</button></div>
      </div>
    </form>
    <form class="card" data-form="conta">${cardH('user', 'Minha conta', '#10b981', '#06b6d4')}
      <div style="display:flex;gap:14px;align-items:center;margin-bottom:16px">${avatar(usuario.nome, 'lg')}<div><b>${esc(usuario.nome)}</b><br><small class="muted">${esc(usuario.email || '')} · ${pill(usuario.geral ? 'Administrador geral' : PAPEIS[usuario.papel].nome, PAPEIS[usuario.papel].cor)}</small></div></div>
      ${campo('Nome de exibição', inp('nome', usuario.nome, 'text', 'required'))}
      <div class="form-actions"><button class="btn primary" type="submit">${ic('check')} Salvar nome</button></div>
    </form>
    <form class="card" data-form="senha">${cardH('key', 'Alterar senha', '#f59e0b', '#f97316')}
      <div style="display:flex;flex-direction:column;gap:14px">
        ${campo('Senha atual', pwField('atual', 'current-password', 'required'))}
        ${campo('Nova senha (mín. 6 caracteres)', pwField('nova', 'new-password', 'required'))}
        ${campo('Confirmar nova senha', pwField('nova2', 'new-password', 'required'))}
      </div>
      <div class="form-actions"><button class="btn primary" type="submit">${ic('lock')} Alterar senha</button></div>
    </form>
  </div>
  <div class="card">${cardH('zap', 'Atalhos', '#8b5cf6', '#ec4899')}
    <div class="toolbar"><span><kbd>Ctrl</kbd> + <kbd>K</kbd> busca rápida</span><span><kbd>Esc</kbd> fecha janelas</span><span><kbd>[</kbd> recolhe/expande o menu</span></div>
  </div>`;
}

/* =====================================================================
   ADMINISTRAÇÃO
   ===================================================================== */
function vAdmin() {
  const tab = ui.adminTab;
  const tabs = [['usuarios', 'users', 'Usuários'], ['igreja', 'church', 'Dados da igreja'], ['financeiro', 'wallet', 'Financeiro'], ['dados', 'database', 'Backup e dados'], ['log', 'activity', 'Atividades']];
  const ub = db.config.ultimoBackup;
  const corpo = { usuarios: admUsuarios, igreja: admIgreja, financeiro: admFin, dados: admDados, log: admLog }[tab] || admUsuarios;
  return `
  <section class="banner-adm">
    <span class="big-ic">${ic('shield')}</span>
    <div><h2>Painel do administrador</h2><p>Gerencie contas de acesso, dados da igreja, backup e histórico.</p></div>
    <div class="stats">
      <div class="st"><b>${db.usuarios.filter(u => u.ativo !== false).length}</b><small>usuários ativos</small></div>
      <div class="st"><b>${ub ? fmtData(ub.slice(0, 10)) : '—'}</b><small>último backup</small></div>
      <div class="st"><b>${db.log.length}</b><small>registros de atividade</small></div>
    </div>
  </section>
  <div class="tabs no-print">${tabs.map(([k, i, l]) => `<button class="tab ${tab === k ? 'on' : ''}" data-act="adminTab" data-tab="${k}">${ic(i)}${l}</button>`).join('')}</div>
  ${corpo()}`;
}
function admUsuarios() {
  return `
  <div class="grid g21">
    <div class="card">${cardH('users', 'Contas de acesso', '#8b5cf6', '#06b6d4', `<button class="btn primary sm" data-act="novoUsuario">${ic('plus')} Novo usuário</button>`)}
      ${db.usuarios.some(u => u.papel === 'pendente') ? `<div class="note" style="margin-bottom:12px">${ic('alert')}<span><b>${db.usuarios.filter(u => u.papel === 'pendente').length} conta(s) aguardando aprovação.</b> Clique em editar e escolha um perfil de acesso para liberar.</span></div>` : ''}
      <div class="table-wrap"><table><thead><tr><th>Usuário</th><th>Perfil</th><th>Situação</th><th>Último acesso</th><th></th></tr></thead><tbody>
      ${[...db.usuarios].sort((a, b) => (a.papel === 'pendente' ? -1 : 0) - (b.papel === 'pendente' ? -1 : 0) || String(a.nome).localeCompare(String(b.nome))).map(u => { const p = PAPEIS[u.papel] || PAPEIS.pendente, mb = db.membros.find(x => x.id === u.membroId); return `<tr><td><div class="who-cell">${avatar(u.nome || u.email, '', mb && mb.foto)}<div><b>${esc(u.nome || '—')}${u.id === usuario.id ? ' <small style="display:inline">(você)</small>' : ''}</b><small>${esc(u.email || '')}${mb ? ' · perfil: ' + esc(mb.nome) : ''}</small></div></div></td>
        <td>${u.geral ? pill('Administrador geral', '#8b5cf6') : pill(p.nome, p.cor)}</td><td>${u.ativo !== false ? pill('Ativo', '#10b981') : pill('Desativado', '#64748b')}</td>
        <td><small>${u.ultimoAcesso ? fmtDataHora(u.ultimoAcesso) : 'nunca'}</small></td>
        <td class="actions"><button class="btn ico" data-act="editarUsuario" data-id="${u.id}" data-tip="Editar / liberar acesso" aria-label="Editar">${ic('edit')}</button>${u.email ? `<button class="btn ico" data-act="resetSenha" data-id="${u.id}" data-tip="Enviar e-mail para redefinir senha" aria-label="Redefinir senha">${ic('key')}</button>` : ''}</td></tr>`; }).join('')}
      </tbody></table></div>
    </div>
    <div class="card">${cardH('shield', 'Perfis de acesso', '#f97316', '#ec4899')}
      <div class="list">${Object.entries(PAPEIS).filter(([k]) => k !== 'pendente').map(([k, p]) => `<div class="li"><span class="ic-b" style="--c1:${p.cor};--c2:${p.cor}">${ic(k === 'admin' ? 'shield' : k === 'pastor' ? 'church' : k === 'tesoureiro' ? 'wallet' : k === 'secretario' ? 'users' : 'eye')}</span><span class="info"><b>${p.nome}</b><small style="white-space:normal">${p.desc}</small></span></div>`).join('')}</div>
      <div class="note info" style="margin-top:12px">${ic('info')}<span>Quem cria conta pela tela de login fica <b>aguardando aprovação</b> até um administrador escolher o perfil. Os dados ficam protegidos no Firebase por regras de segurança no servidor.</span></div>
    </div>
  </div>`;
}
function admIgreja() {
  const g = IG();
  return `<form class="card" data-form="igreja">${cardH('church', 'Dados da igreja', '#8b5cf6', '#06b6d4', '<small>Aparecem no painel, recibos, relatórios e na tela de login.</small>')}
    <div class="form-grid">
      ${campo('Nome da igreja', inp('nome', g.nome, 'text', 'required'))}
      ${campo('Vínculo / extensão', inp('extensao', g.extensao))}
      ${campo('Endereço (rua/travessa e número)', inp('endereco', g.endereco, 'text', 'required'), 'full')}
      ${campo('Bairro', inp('bairro', g.bairro))}
      ${campo('Cidade', inp('cidade', g.cidade))}
      ${campo('UF', inp('uf', g.uf, 'text', 'maxlength="2"'))}
      ${campo('CEP', inp('cep', g.cep))}
      ${campo('Telefone / WhatsApp', inp('telefone', g.telefone, 'tel'))}
      ${campo('E-mail', inp('email', g.email, 'email'))}
      ${campo('Pastor responsável', inp('pastor', g.pastor))}
      ${campo('Pastora (esposa do pastor)', inp('pastora', g.pastora))}
      ${campo('Fundada em (ano)', inp('desde', g.desde, 'number', 'min="1900" max="2100"'))}
    </div>
    <div class="form-actions"><button type="button" class="btn" data-act="restaurarIgreja">Restaurar padrão</button><button type="submit" class="btn primary">${ic('check')} Salvar dados</button></div>
  </form>`;
}
function admFin() {
  return `<form class="card" data-form="fin">${cardH('wallet', 'Configurações financeiras', '#10b981', '#06b6d4')}
    <div class="form-grid">
      ${campo('Saldo inicial do caixa (R$)', inp('saldoInicial', db.config.saldoInicial || 0, 'number', 'step="0.01"') + '<span class="hint">Valor em caixa antes do primeiro lançamento no sistema.</span>')}
      ${campo('Meta mensal de entradas (R$)', inp('meta', db.config.meta || 0, 'number', 'step="0.01" min="0"') + '<span class="hint">Mostra um anel de progresso no painel. Use 0 para esconder.</span>')}
    </div>
    <div class="form-actions"><button type="submit" class="btn primary">${ic('check')} Salvar</button></div>
  </form>`;
}
function admDados() {
  return `<div class="grid g2">
    <div class="card">${cardH('download', 'Backup', '#8b5cf6', '#06b6d4')}
      <p class="muted">Os dados ficam salvos na nuvem (Firebase) e sincronizam entre computadores e celulares. Mesmo assim, baixe um backup de vez em quando e guarde em pendrive ou e-mail. As contas de usuário não vão no arquivo.</p>
      <div class="form-actions"><label class="btn">${ic('upload')} Restaurar backup<input type="file" accept="application/json,.json" id="importFile" hidden></label><button class="btn primary" data-act="exportar">${ic('download')} Baixar backup (.json)</button></div>
    </div>
    <div class="card">${cardH('zap', 'Modo de teste', '#f59e0b', '#ec4899')}
      <p class="muted">Gera membros, dízimos, ofertas, despesas, eventos e registros de culto fictícios dos últimos 3 meses. <b>Substitui</b> os dados atuais (usuários são mantidos).</p>
      <div class="form-actions"><button class="btn danger" data-act="apagarTudo">${ic('trash')} Apagar todos os dados</button><button class="btn warm" data-act="carregarDemo">${ic('sparkles')} Carregar dados de exemplo</button></div>
    </div>
  </div>
  <div class="card">${cardH('info', 'Resumo do banco de dados', '#06b6d4', '#10b981')}
    <div class="toolbar">${[['users', 'Membros', db.membros.length], ['wallet', 'Entradas', db.entradas.length], ['receipt', 'Despesas', db.despesas.length], ['sparkles', 'Eventos', db.eventos.length], ['calendar', 'Cultos registrados', Object.keys(db.cultos).length], ['shield', 'Usuários', db.usuarios.length]].map(([i, l, n]) => `<span class="pill" style="--p:${corDe(l)};padding:6px 12px">${ic(i)} ${l}: <b>${n}</b></span>`).join('')}</div>
  </div>`;
}
function admLog() {
  return `<div class="card">${cardH('activity', 'Histórico de atividades', '#06b6d4', '#8b5cf6', `<input type="search" placeholder="Filtrar…" value="${esc(ui.f.log)}" data-filter="log" style="width:220px" aria-label="Filtrar atividades">`)}<div id="part">${admLogTabela()}</div></div>`;
}
function admLogTabela() {
  const q = norm(ui.f.log);
  const rows = db.log.filter(l => !q || norm(`${l.u} ${l.acao} ${l.det}`).includes(q)).slice(0, 200);
  if (!rows.length) return vazioHtml('activity', 'Nenhuma atividade registrada.');
  return `<div class="table-wrap"><table><thead><tr><th>Quando</th><th>Usuário</th><th>Ação</th><th>Detalhe</th></tr></thead><tbody>${rows.map(l => `<tr><td><small>${fmtDataHora(l.t)}</small></td><td><div class="who-cell">${avatar(l.u)}<b>${esc(l.u)}</b></div></td><td>${esc(l.acao)}</td><td class="muted">${esc(l.det || '')}</td></tr>`).join('')}</tbody></table></div>`;
}
function abrirUsuario(id) {
  if (papel() !== 'admin') return;
  const u = id ? db.usuarios.find(x => x.id === id) : { papel: 'secretario', ativo: true };
  if (!u) return;
  const papeis = Object.entries(PAPEIS).filter(([k]) => k !== 'pendente' || u.papel === 'pendente').map(([k, p]) => [k, p.nome]);
  abrirModal({
    titulo: id ? 'Editar usuário' : 'Novo usuário',
    corpo: `<div class="form-grid">
      ${campo('Nome *', inp('nome', u.nome || '', 'text', 'required'), 'full')}
      ${campo('E-mail (login) *', inp('email', u.email || '', 'email', `required autocomplete="off" ${id ? 'readonly' : ''}`), 'full')}
      ${u.geral ? `<div class="note info full">${ic('shield')}<span>Esta é a conta de <b>Administrador geral</b>: ela não pode perder o acesso de administrador.</span></div>` : campo('Perfil de acesso', sel('papel', papeis, u.papel))}
      ${campo('Vincular ao perfil de membro', sel('membroId', [['', '— Nenhum —'], ...[...db.membros].sort((a, b) => a.nome.localeCompare(b.nome)).map(m => [m.id, m.nome])], u.membroId || ''))}
      ${id ? '' : campo('Senha inicial * (mín. 6)', pwField('senha', 'new-password', 'required'), 'full')}
      ${u.geral ? '' : `<label class="switch full"><input type="checkbox" name="ativo" ${u.ativo !== false ? 'checked' : ''}> Conta ativa</label>`}
      <div class="note info full">${ic('info')}<span>${id ? 'Para trocar a senha deste usuário, use o botão de chave na lista: ele recebe um e-mail para criar uma nova senha.' : 'A pessoa entra com este e-mail e a senha inicial, e pode trocar a senha depois em Configurações.'}</span></div>
    </div>`,
    aoSalvar: async f => {
      const nome = f.nome.trim(), email = String(f.email || '').trim().toLowerCase();
      const papelNovo = u.geral ? 'admin' : f.papel, ativo = u.geral ? true : f.ativo === 'on';
      if (!nome) { toast('Informe o nome.', 'warn'); return false; }
      if (!id && (!/^\S+@\S+\.\S+$/.test(email) || (f.senha || '').length < 6)) { toast('Informe um e-mail válido e senha com pelo menos 6 caracteres.', 'warn'); return false; }
      try {
        if (id) {
          await updateDoc(doc(fs, 'users', id), { nome, papel: papelNovo, ativo, membroId: f.membroId || '' });
        } else {
          // Cria a conta numa instância separada para não deslogar o administrador
          const sec = initializeApp(FIREBASE_CONFIG, 'cadastro-' + Date.now());
          try {
            const cred = await createUserWithEmailAndPassword(getAuth(sec), email, f.senha);
            await updateProfile(cred.user, { displayName: nome });
            await setDoc(doc(fs, 'users', cred.user.uid), { nome, email, papel: papelNovo, ativo, geral: false, membroId: f.membroId || '', criado: new Date().toISOString(), ultimoAcesso: '' });
            await signOut(getAuth(sec));
          } finally { deleteApp(sec).catch(() => {}); }
        }
      } catch (e) { console.error(e); toast(e.code && e.code.startsWith('auth/') ? msgAuth(e) : 'Sem permissão ou sem internet para salvar o usuário.', 'err'); return false; }
      registrar(id ? 'Editou usuário' : 'Criou usuário', `${nome} (${PAPEIS[papelNovo].nome})`); salvar();
      toast(id ? 'Usuário atualizado.' : 'Usuário criado.', 'ok');
    },
  });
}

/* =====================================================================
   NOTIFICAÇÕES
   ===================================================================== */
let notifs = [];
function coletarNotificacoes() {
  const out = [], agora = new Date(), h = hoje(), hIso = iso(h), am = new Date(h); am.setDate(am.getDate() + 1);
  [...cultosDoDia(h), ...cultosDoDia(am)].forEach(c => {
    const ini = inicioDoCulto(c), fim = fimDoCulto(c); if (fim < agora) return;
    const live = agora >= ini;
    out.push({ id: 'c:' + c.key, ic: c.ic, c1: c.cor, c2: c.cor2, t: live ? `${c.nome} está acontecendo agora` : `${c.nome} ${c.data === hIso ? 'hoje' : 'amanhã'} às ${c.inicio}`, s: live ? `Até ${c.fim}` : `Começa ${relativo(ini)}`, quando: +ini, act: 'abrirCulto', ref: c.key });
  });
  db.eventos.forEach(e => { const d = diasAte(e.data); if (d >= 0 && d <= 7) out.push({ id: `e:${e.id}:${e.data}`, ic: 'sparkles', c1: '#ec4899', c2: '#f97316', t: e.titulo, s: `${d === 0 ? 'Hoje' : d === 1 ? 'Amanhã' : `Em ${d} dias`}${e.inicio ? ' às ' + e.inicio : ''}${e.local ? ' · ' + e.local : ''}`, quando: +horaEm(e.data, e.inicio), act: 'editarEvento', ref: e.id }); });
  const md = hIso.slice(5);
  db.membros.filter(mb => mb.ativo !== false && mb.nascimento && mb.nascimento.slice(5) === md).forEach(mb => out.push({ id: `a:${mb.id}:${hIso}`, ic: 'cake', c1: '#f59e0b', c2: '#ec4899', t: `Aniversário de ${mb.nome} 🎂`, s: 'Hoje · mande uma mensagem de parabéns', quando: +h, act: 'zap', ref: mb.id }));
  if (papel() === 'admin') {
    const ub = db.config.ultimoBackup, dias = ub ? Math.floor((Date.now() - new Date(ub)) / 86400000) : null;
    if ((db.membros.length || db.entradas.length) && (dias === null || dias >= 7)) out.push({ id: 'b:' + hIso, ic: 'database', c1: '#8b5cf6', c2: '#06b6d4', t: 'Faça um backup dos dados', s: ub ? `Último backup há ${dias} dias` : 'Nenhum backup feito ainda', quando: +h + 1, act: 'irAdminDados' });
  }
  return out.sort((a, b) => a.quando - b.quando);
}
function atualizarSino() {
  if (!usuario) return;
  notifs = coletarNotificacoes();
  const n = notifs.filter(x => !prefs.lidas.includes(x.id)).length;
  const b = $('#bellBadge'); b.hidden = !n; b.textContent = n > 9 ? '9+' : n;
  if (!$('#notifPanel').hidden) desenharNotif();
}
function desenharNotif() {
  const p = $('#notifPanel'), perm = 'Notification' in window ? Notification.permission : 'x';
  p.innerHTML = `
    <div class="np-head"><b>Notificações</b>${notifs.length ? '<button class="btn sm" data-act="lerTodas">Marcar como lidas</button>' : ''}</div>
    <div class="np-list">${notifs.length ? notifs.map(x => `<button class="np-it ${prefs.lidas.includes(x.id) ? '' : 'unread'}" data-act="notifAbrir" data-id="${esc(x.id)}"><span class="np-ic" style="--c1:${x.c1};--c2:${x.c2}">${ic(x.ic)}</span><span><b>${esc(x.t)}</b><small>${esc(x.s)}</small></span></button>`).join('') : vazioHtml('bell', 'Tudo em dia! Nenhuma notificação.')}</div>
    <div class="np-foot"><span>${prefs.notifNav && perm === 'granted' ? `${ic('check')} Avisos do navegador ativos` : 'Avisos do navegador desligados'}</span><a href="#config" data-act="fecharNotif">Configurar</a></div>`;
}
function verificarAlertas() {
  if (!usuario) return;
  const agora = new Date(), ant = (Number(prefs.antecedencia) || 30) * 60000, h = hoje(), am = new Date(h); am.setDate(am.getDate() + 1);
  const cand = [...cultosDoDia(h), ...cultosDoDia(am)].map(c => ({ k: 'c:' + c.key, ini: inicioDoCulto(c), t: c.nome, local: IG().nome }))
    .concat(db.eventos.filter(e => e.inicio).map(e => ({ k: 'e:' + e.id + ':' + e.data + e.inicio, ini: horaEm(e.data, e.inicio), t: e.titulo, local: e.local || '' })));
  cand.forEach(x => {
    const diff = x.ini - agora;
    if (diff > 0 && diff <= ant && !prefs.notificados[x.k]) {
      prefs.notificados[x.k] = Date.now();
      const quando = diff < 3600000 ? `em ${Math.max(1, Math.round(diff / 60000))} min` : `às ${pad(x.ini.getHours())}:${pad(x.ini.getMinutes())}`;
      toast(`${x.t} começa ${quando}`, 'info');
      if (prefs.notifNav && 'Notification' in window && Notification.permission === 'granted') {
        try { new Notification(`⛪ ${x.t}`, { body: `Começa ${quando}${x.local ? ' · ' + x.local : ''}`, icon: 'img/emblema.png', tag: x.k }); } catch (e) { /* alguns navegadores exigem service worker */ }
      }
    }
  });
  const limite = Date.now() - 3 * 86400000;
  Object.keys(prefs.notificados).forEach(k => { if (prefs.notificados[k] < limite) delete prefs.notificados[k]; });
  salvarPrefs();
  atualizarSino();
}

/* =====================================================================
   BUSCA RÁPIDA (Ctrl+K)
   ===================================================================== */
let palItens = [], palIdx = 0;
function abrirPaleta() { const d = $('#paleta'); if (d.open || !usuario) return; d.showModal(); $('#palInput').value = ''; filtrarPaleta(); $('#palInput').focus(); }
function fontePaleta() {
  const it = [];
  NAV.forEach(g => g.itens.forEach(([r, i, l]) => { if (pode(r)) it.push({ ic: i, t: l, s: 'Ir para a página', run: () => { location.hash = '#' + r; } }); }));
  if (edita('financeiro')) { it.push({ ic: 'heart', t: 'Lançar dízimo', s: 'Ação rápida', run: () => abrirEntrada(null, { tipo: 'Dízimo' }) }); it.push({ ic: 'gift', t: 'Lançar oferta', s: 'Ação rápida', run: () => abrirEntrada(null, { tipo: 'Oferta' }) }); }
  if (edita('despesas')) it.push({ ic: 'receipt', t: 'Nova despesa', s: 'Ação rápida', run: () => abrirDespesa(null) });
  if (edita('membros')) it.push({ ic: 'user', t: 'Novo membro', s: 'Ação rápida', run: () => abrirMembro(null) });
  if (edita('eventos')) it.push({ ic: 'sparkles', t: 'Novo evento', s: 'Ação rápida', run: () => abrirEvento(null) });
  it.push({ ic: prefs.tema === 'dark' ? 'sun' : 'moon', t: 'Alternar tema claro/escuro', s: 'Aparência', run: () => ACT.tema({}) });
  it.push({ ic: 'sidebar', t: 'Esconder / mostrar menu lateral', s: 'Aparência', run: () => ACT.menu() });
  proximosCultos(6).forEach(c => it.push({ ic: c.ic, cor: c.cor, t: c.nome, s: `Culto · ${DIAS_C[parse(c.data).getDay()]} ${fmtDM(c.data)} às ${c.inicio}`, run: () => abrirCulto(c.key) }));
  if (pode('membros')) db.membros.forEach(mb => it.push({ av: mb.nome, t: mb.nome, s: `Membro · ${mb.cargo}${mb.departamento ? ' · ' + mb.departamento : ''}`, run: () => abrirMembro(mb.id), busca: true }));
  if (pode('eventos')) db.eventos.forEach(e => it.push({ ic: 'sparkles', t: e.titulo, s: `Evento · ${fmtData(e.data)}`, run: () => abrirEvento(e.id), busca: true }));
  it.push({ ic: 'logout', t: 'Sair do sistema', s: 'Conta', run: () => ACT.sair() });
  return it;
}
function filtrarPaleta() {
  const q = norm($('#palInput').value.trim()), all = fontePaleta();
  palItens = (q ? all.filter(x => norm(x.t + ' ' + x.s).includes(q)) : all.filter(x => !x.busca)).slice(0, 14);
  palIdx = 0; desenharPaleta();
}
function desenharPaleta() {
  $('#palList').innerHTML = palItens.length ? palItens.map((x, i) => `<button type="button" class="pal-it ${i === palIdx ? 'on' : ''}" data-pi="${i}">${x.av ? avatar(x.av) : `<span class="pi" ${x.cor ? `style="color:${x.cor}"` : ''}>${ic(x.ic)}</span>`}<span><b>${esc(x.t)}</b><small>${esc(x.s)}</small></span></button>`).join('') : vazioHtml('search', 'Nada encontrado.');
  const on = $('#palList .on'); if (on) on.scrollIntoView({ block: 'nearest' });
}
function executarPaleta(i) { const x = palItens[i]; if (!x) return; $('#paleta').close(); x.run(); }
$('#palInput').addEventListener('input', filtrarPaleta);
$('#palInput').addEventListener('keydown', e => {
  if (e.key === 'ArrowDown') { e.preventDefault(); palIdx = Math.min(palItens.length - 1, palIdx + 1); desenharPaleta(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); palIdx = Math.max(0, palIdx - 1); desenharPaleta(); }
  else if (e.key === 'Enter') { e.preventDefault(); executarPaleta(palIdx); }
});
$('#palList').addEventListener('click', e => { const b = e.target.closest('[data-pi]'); if (b) executarPaleta(Number(b.dataset.pi)); });
$('#paleta').addEventListener('click', e => { if (e.target.id === 'paleta') $('#paleta').close(); });

/* =====================================================================
   DADOS DE EXEMPLO (fictícios)
   ===================================================================== */
function gerarDemo() {
  let s = 2012;
  const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const ri = (a, b) => Math.floor(a + rnd() * (b - a + 1));
  const pick = arr => arr[ri(0, arr.length - 1)];
  const t = hoje(), agora = new Date();
  const novo = vazio();
  novo.usuarios = db.usuarios; novo.log = db.log; novo.config = db.config;
  const base = [
    ['Antônio Carlos Ferreira', 'Pastor', 'Senhores'], ['Maria do Socorro Ferreira', 'Pastora', 'Senhoras'],
    ['José Raimundo Lima', 'Presbítero', 'Senhores'], ['Raimunda Nonata Lima', 'Membro', 'Senhoras'],
    ['Francisco das Chagas Souza', 'Diácono', 'Senhores'], ['Ana Lúcia Souza', 'Diaconisa', 'Senhoras'],
    ['Pedro Henrique Batista', 'Evangelista', 'Senhores'], ['Joana Batista dos Santos', 'Membro', 'Senhoras'],
    ['Lucas Gabriel Santos', 'Auxiliar', 'Jovens'], ['Ana Beatriz Costa', 'Membro', 'Jovens'],
    ['Marcos Vinícius Pereira', 'Membro', 'Jovens'], ['Sebastiana Correia', 'Membro', 'Senhoras'],
    ['Manoel Messias Oliveira', 'Diácono', 'Senhores'], ['Kauã Oliveira', 'Membro', 'Adolescentes'],
    ['Maria Eduarda Pereira', 'Congregado', 'Adolescentes'], ['Benedito Gomes', 'Membro', 'Senhores'],
    ['Davi Lucas Correia', 'Membro', 'Crianças'], ['Rebeca Lima', 'Membro', 'Crianças'],
  ];
  novo.membros = base.map(([nome, cargo, departamento], i) => {
    const anoNasc = departamento === 'Crianças' ? ri(2015, 2019) : departamento === 'Adolescentes' ? ri(2009, 2012) : departamento === 'Jovens' ? ri(1998, 2006) : ri(1955, 1990);
    const mesNasc = i < 3 ? t.getMonth() : ri(0, 11);
    const dia = i === 0 ? t.getDate() : ri(1, 28);
    return { id: 'm' + i, nome, cargo, departamento, ativo: i !== 15, sexo: /Senhoras|^Ana|^Maria|^Joana|^Rebeca|^Raimunda|^Sebastiana/.test(departamento + nome) && !/Senhores/.test(departamento) ? 'Feminino' : 'Masculino',
      estadoCivil: ['Senhoras', 'Senhores'].includes(departamento) ? 'Casado(a)' : 'Solteiro(a)', conjuge: i === 0 ? 'Maria do Socorro Ferreira' : i === 1 ? 'Antônio Carlos Ferreira' : '', ministerios: i < 3 ? 'Ministério da Palavra' : i % 4 === 0 ? 'Louvor' : '', telefone: `(93) 9${ri(8000, 9999)}-${ri(1000, 9999)}`, nascimento: `${anoNasc}-${pad(mesNasc + 1)}-${pad(dia)}`, batismo: departamento === 'Crianças' ? '' : `${ri(2005, 2023)}-${pad(ri(1, 12))}-${pad(ri(1, 28))}`, desde: `${ri(2012, 2024)}-${pad(ri(1, 12))}-01`, endereco: IG().cidade + ' – ' + IG().uf, obs: '' };
  });
  const dizimistas = novo.membros.filter((mb, i) => mb.ativo && i % 5 !== 4 && mb.departamento !== 'Crianças').map(mb => ({ mb, valor: pick([50, 60, 80, 100, 120, 150, 200, 250, 300]) }));
  const pregadores = novo.membros.filter(mb => OBREIROS.includes(mb.cargo)).map(mb => mb.nome);
  for (let k = 2; k >= 0; k--) {
    const ref = new Date(t.getFullYear(), t.getMonth() - k, 1), y = ref.getFullYear(), m = ref.getMonth();
    const cultos = cultosDoMes(y, m).filter(c => fimDoCulto(c) <= agora);
    const domNoite = cultos.filter(c => parse(c.data).getDay() === 0 && c.tipo !== 'ebd');
    cultos.forEach(c => {
      const faixa = { ebd: [35, 60], circulo: [10, 22], treinamento: [25, 45], oracao: [25, 45] }[c.tipo] || [55, 95];
      novo.cultos[c.key] = { dirigente: pick(pregadores), pregador: pick(pregadores), tema: '', presentes: ri(...faixa), visitantes: ri(0, c.tipo === 'circulo' ? 1 : 7), obs: '' };
      const vOf = { ebd: [2000, 6000], circulo: [1000, 3500], treinamento: [3000, 9000], oracao: [3000, 8000] }[c.tipo] || [12000, 32000];
      novo.entradas.push({ id: uid(), data: c.data, tipo: 'Oferta', membroId: '', nome: 'Oferta do culto', valor: ri(...vOf) / 100, forma: rnd() < 0.2 ? 'PIX' : 'Dinheiro', cultoKey: c.key, obs: '' });
      if (c.tipo === 'ceia') novo.entradas.push({ id: uid(), data: c.data, tipo: 'Oferta Missionária', membroId: '', nome: 'Oferta missionária', valor: ri(5000, 15000) / 100, forma: 'Dinheiro', cultoKey: c.key, obs: '' });
    });
    if (domNoite.length) dizimistas.forEach(({ mb, valor }) => { if (rnd() < 0.12) return; const c = pick(domNoite); novo.entradas.push({ id: uid(), data: c.data, tipo: 'Dízimo', membroId: mb.id, nome: mb.nome, valor, forma: rnd() < 0.35 ? 'PIX' : 'Dinheiro', cultoKey: c.key, obs: '' }); });
    if (k === 1 && domNoite.length) novo.entradas.push({ id: uid(), data: domNoite[0].data, tipo: 'Campanha', membroId: '', nome: 'Campanha da reforma', valor: 640, forma: 'PIX', cultoKey: domNoite[0].key, obs: '' });
    const desp = [[10, 'Energia', 'Conta de energia', ri(18000, 32000)], [12, 'Água', 'Conta de água', ri(4000, 8000)], [5, 'Limpeza', 'Material de limpeza', ri(5000, 12000)], [20, 'Missões', 'Repasse missionário', 15000], [15, 'Ajuda de custo', 'Ajuda de custo – obreiros', 30000]];
    if (k === 1) desp.push([18, 'Manutenção', 'Reparo no ventilador do templo', 18500]);
    desp.forEach(([dia, categoria, descricao, cent]) => { const data = `${y}-${pad(m + 1)}-${pad(dia)}`; if (data <= iso(t)) novo.despesas.push({ id: uid(), data, categoria, descricao, valor: cent / 100, forma: pick(['Dinheiro', 'PIX']) }); });
  }
  const rel = n => { const d = hoje(); d.setDate(d.getDate() + n); return iso(d); };
  const local = 'Templo – ' + IG().cidade;
  novo.eventos = [
    { id: uid(), titulo: 'Congresso de Senhoras', data: rel(14), inicio: '19:00', fim: '21:30', local, responsavel: 'Dep. de Senhoras', descricao: 'Exemplo de evento.' },
    { id: uid(), titulo: 'Batismo nas Águas', data: rel(22), inicio: '08:00', fim: '11:00', local: 'Rio Curuá', responsavel: 'Pastor', descricao: 'Candidatos devem participar da aula preparatória.' },
    { id: uid(), titulo: 'Ensaio do Coral', data: rel(1), inicio: '17:00', fim: '18:30', local, responsavel: 'Jovens', descricao: '' },
    { id: uid(), titulo: 'Cantata de Natal', data: `${t.getFullYear()}-12-24`, inicio: '19:30', fim: '21:30', local, responsavel: 'Jovens e Adolescentes', descricao: '' },
    { id: uid(), titulo: 'Culto de Ação de Graças', data: `${t.getFullYear()}-12-31`, inicio: '20:00', fim: '23:59', local, responsavel: 'Ministério', descricao: 'Virada de ano.' },
    { id: uid(), titulo: 'Confraternização da EBD', data: rel(-20), inicio: '10:00', fim: '12:00', local, responsavel: 'Superintendência da EBD', descricao: '' },
  ].filter(e => e.data >= rel(-60));
  return novo;
}

/* =====================================================================
   AÇÕES
   ===================================================================== */
function baixar(nome, conteudo, tipo) {
  const blob = new Blob([conteudo], { type: tipo }), a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = nome; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function aplicarTema() { document.documentElement.dataset.theme = prefs.tema === 'light' ? 'light' : 'dark'; const b = $('#themeBtn'); if (b) b.innerHTML = ic(prefs.tema === 'light' ? 'moon' : 'sun'); $('meta[name=theme-color]').content = prefs.tema === 'light' ? '#eef2fb' : '#060914'; }
function aplicarSidebar() { document.body.classList.toggle('sb-mini', prefs.sidebar === 'mini'); document.body.classList.toggle('sb-hidden', prefs.sidebar === 'oculta'); }
function fecharNotif() { $('#notifPanel').hidden = true; }

const ACT = {
  mesAnt: () => { ui.m--; if (ui.m < 0) { ui.m = 11; ui.y--; } render(); },
  mesProx: () => { ui.m++; if (ui.m > 11) { ui.m = 0; ui.y++; } render(); },
  mesAtual: () => { ui.y = hoje().getFullYear(); ui.m = hoje().getMonth(); render(); },
  agendaModo: d => { prefs.agenda = d.modo; salvarPrefs(); render(); },
  filtroDepto: d => { ui.f.depto = d.v; render(); },
  filtroEvt: d => { ui.f.evt = d.v; render(); },
  imprimir: () => window.print(),
  abrirCulto: d => abrirCulto(d.key),
  novaEntrada: d => abrirEntrada(null, d.tipo ? { tipo: d.tipo } : {}),
  editarEntrada: d => abrirEntrada(d.id),
  excluirEntrada: d => { const e = db.entradas.find(x => x.id === d.id); if (e && edita('financeiro') && confirm(`Excluir ${e.tipo} de ${brl(e.valor)} (${e.nome})?`)) { db.entradas = db.entradas.filter(x => x.id !== d.id); registrar('Excluiu lançamento', `${e.tipo} ${brl(e.valor)} · ${e.nome}`); salvar(); render(); toast('Lançamento excluído.', 'ok'); } },
  recibo: d => recibo(d.id),
  novaDespesa: () => abrirDespesa(null),
  editarDespesa: d => abrirDespesa(d.id),
  excluirDespesa: d => { const x = db.despesas.find(z => z.id === d.id); if (x && edita('despesas') && confirm(`Excluir a despesa "${x.descricao}"?`)) { db.despesas = db.despesas.filter(z => z.id !== d.id); registrar('Excluiu despesa', `${x.descricao} ${brl(x.valor)}`); salvar(); render(); toast('Despesa excluída.', 'ok'); } },
  novoMembro: () => abrirMembro(null),
  editarMembro: d => abrirMembro(d.id),
  excluirMembro: d => {
    const mb = db.membros.find(x => x.id === d.id); if (!mb || !edita('membros')) return;
    if (confirm(`Excluir ${mb.nome}? Os lançamentos continuam no histórico com o nome registrado.\n\nDica: para quem saiu da igreja, prefira marcar como inativo.`)) {
      db.membros = db.membros.filter(x => x.id !== d.id); db.entradas.forEach(e => { if (e.membroId === d.id) e.membroId = ''; });
      registrar('Excluiu membro', mb.nome); salvar(); render(); toast('Membro excluído.', 'ok');
    }
  },
  novoEvento: () => abrirEvento(null),
  editarEvento: d => abrirEvento(d.id),
  adminTab: d => { ui.adminTab = d.tab; render(); },
  irAdminLog: () => { ui.adminTab = 'log'; location.hash = '#admin'; render(); },
  irAdminDados: () => { ui.adminTab = 'dados'; location.hash = '#admin'; render(); },
  irAdminIgreja: () => { ui.adminTab = 'igreja'; },
  novoUsuario: () => abrirUsuario(null),
  editarUsuario: d => abrirUsuario(d.id),
  resetSenha: async d => {
    const u = db.usuarios.find(x => x.id === d.id); if (!u || !u.email || papel() !== 'admin') return;
    if (!confirm(`Enviar para ${u.email} um e-mail com o link para criar uma nova senha?`)) return;
    try { await sendPasswordResetEmail(auth, u.email); registrar('Enviou redefinição de senha', u.email); salvar(); toast('E-mail de redefinição enviado.', 'ok'); }
    catch (e) { toast(msgAuth(e), 'err'); }
  },
  membrosModo: d => { prefs.membros = d.v; salvarPrefs(); render(); },
  imprimirFicha: d => fichaMembro(d.id),
  restaurarIgreja: () => { if (confirm('Restaurar os dados padrão da igreja?')) { db.config.igreja = { ...IGREJA_PADRAO }; registrar('Restaurou dados da igreja'); salvar(); render(); toast('Dados restaurados.', 'ok'); } },
  carregarDemo: () => {
    if (papel() !== 'admin') return;
    if ((db.membros.length || db.entradas.length) && !confirm('Isso vai SUBSTITUIR membros, lançamentos, eventos e cultos por dados de exemplo. Os usuários são mantidos. Continuar?')) return;
    db = gerarDemo(); registrar('Carregou dados de exemplo'); salvar(); render(); toast('Dados de exemplo carregados.', 'ok');
  },
  apagarTudo: () => {
    if (papel() !== 'admin') return;
    if (confirm('Apagar membros, lançamentos, despesas, eventos e registros de culto deste navegador? Os usuários e configurações são mantidos.\n\nEsta ação não pode ser desfeita. Baixe um backup antes.')) {
      db = { ...vazio(), usuarios: db.usuarios, log: db.log, config: db.config }; registrar('Apagou todos os dados'); salvar(); render(); toast('Dados apagados.', 'ok');
    }
  },
  exportar: () => {
    const copia = { ...db }; delete copia.usuarios;
    baixar(`backup-igreja-${iso(new Date())}.json`, JSON.stringify(copia, null, 2), 'application/json');
    db.config.ultimoBackup = new Date().toISOString(); registrar('Baixou backup'); salvar(); render(); toast('Backup gerado.', 'ok');
  },
  exportarCSV: () => {
    const rows = noMes(db.entradas, ui.y, ui.m).sort((a, b) => a.data.localeCompare(b.data));
    const linhas = [['Data', 'Tipo', 'Nome', 'Culto', 'Forma', 'Valor'], ...rows.map(e => [fmtData(e.data), e.tipo, e.nome, nomeCulto(e.cultoKey), e.forma, Number(e.valor).toFixed(2).replace('.', ',')])];
    const csv = '﻿' + linhas.map(l => l.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    baixar(`entradas-${prefixoMes(ui.y, ui.m)}.csv`, csv, 'text/csv;charset=utf-8'); toast('Planilha CSV gerada.', 'ok');
  },
  tema: d => { prefs.tema = d && d.v ? d.v : (prefs.tema === 'light' ? 'dark' : 'light'); salvarPrefs(); aplicarTema(); if (rotaAtual === 'config') render(); },
  sidebarMini: () => { prefs.sidebar = prefs.sidebar === 'mini' ? 'aberta' : 'mini'; salvarPrefs(); aplicarSidebar(); if (rotaAtual === 'config') render(); },
  sidebarModo: d => { prefs.sidebar = d.v; salvarPrefs(); aplicarSidebar(); render(); },
  menu: () => {
    if (innerWidth <= 900) { document.body.classList.toggle('menu-open'); return; }
    prefs.sidebar = prefs.sidebar === 'oculta' ? 'aberta' : 'oculta'; salvarPrefs(); aplicarSidebar(); if (rotaAtual === 'config') render();
  },
  sino: () => { const p = $('#notifPanel'); p.hidden = !p.hidden; if (!p.hidden) desenharNotif(); },
  fecharNotif: () => { fecharNotif(); location.hash = '#config'; },
  lerTodas: () => { prefs.lidas = [...new Set([...prefs.lidas, ...notifs.map(x => x.id)])].slice(-300); salvarPrefs(); atualizarSino(); desenharNotif(); },
  notifAbrir: d => {
    const x = notifs.find(n => n.id === d.id); if (!x) return;
    if (!prefs.lidas.includes(x.id)) { prefs.lidas.push(x.id); prefs.lidas = prefs.lidas.slice(-300); salvarPrefs(); }
    fecharNotif(); atualizarSino();
    if (x.act === 'abrirCulto') abrirCulto(x.ref);
    else if (x.act === 'editarEvento') abrirEvento(x.ref);
    else if (x.act === 'irAdminDados') ACT.irAdminDados();
    else if (x.act === 'zap') { const mb = db.membros.find(z => z.id === x.ref), l = mb && linkZap(mb.telefone); if (l) window.open(l, '_blank', 'noopener'); else if (mb) abrirMembro(mb.id); }
  },
  testarNotif: () => {
    toast('Assim aparecem os avisos de culto dentro do sistema. 🔔', 'info');
    if (prefs.notifNav && 'Notification' in window && Notification.permission === 'granted') { try { new Notification('⛪ Teste de aviso', { body: `${IG().nome} – ${IG().extensao}`, icon: 'img/emblema.png' }); } catch (e) { /* ignorado */ } }
    else if ('Notification' in window && Notification.permission !== 'denied') toast('Ative "Avisos do navegador" e salve para receber pop-ups.', 'warn');
  },
  verSenha: (d, el) => { const i = el.parentElement.querySelector('input'); i.type = i.type === 'password' ? 'text' : 'password'; },
  abrirPaleta: () => abrirPaleta(),
  sair: async () => { if (usuario) { registrar('Saiu do sistema'); salvar(); } fecharNotif(); if (modal.open) modal.close(); pararListeners(); usuario = null; await signOut(auth); },
  authModo: d => telaAuth(d.v),
  reenviarVerif: async () => { try { await sendEmailVerification(auth.currentUser); toast('E-mail de confirmação reenviado. Veja também a caixa de spam.', 'ok'); } catch (e) { toast(msgAuth(e), 'err'); } },
  jaConfirmei: async () => { try { await auth.currentUser.reload(); await auth.currentUser.getIdToken(true); await entrarComo(auth.currentUser); } catch (e) { toast(msgAuth(e), 'err'); } },
};

/* ---------- Formulários (submit) ---------- */
const erroAuth = msg => { const e = $('#authErr'); if (e) e.textContent = msg; return false; };
const FORMS = {
  async criar(d) {
    const nome = d.nome.trim(), email = d.email.trim().toLowerCase();
    if (!nome) return erroAuth('Informe seu nome.');
    if (d.senha.length < 6) return erroAuth('A senha precisa ter pelo menos 6 caracteres.');
    if (d.senha !== d.senha2) return erroAuth('As senhas não conferem.');
    nomeCadastro = nome;
    try {
      await setPersistence(auth, browserLocalPersistence);
      const cred = await createUserWithEmailAndPassword(auth, email, d.senha);
      await updateProfile(cred.user, { displayName: nome });
      try { await sendEmailVerification(cred.user); } catch (e) { /* tenta de novo na tela seguinte */ }
    } catch (e) { return erroAuth(msgAuth(e)); }
  },
  async login(d) {
    try {
      await setPersistence(auth, d.lembrar === 'on' ? browserLocalPersistence : browserSessionPersistence);
      await signInWithEmailAndPassword(auth, d.email.trim(), d.senha);
    } catch (e) { return erroAuth(msgAuth(e)); }
  },
  async esqueci(d) {
    try { await sendPasswordResetEmail(auth, d.email.trim()); toast('Se o e-mail estiver cadastrado, você receberá um link para criar nova senha.', 'ok'); telaAuth('login'); }
    catch (e) { return erroAuth(msgAuth(e)); }
  },
  igreja(d) {
    if (papel() !== 'admin') return;
    db.config.igreja = { ...IG(), ...Object.fromEntries(Object.entries(d).map(([k, v]) => [k, String(v).trim()])) };
    db.config.igreja.uf = db.config.igreja.uf.toUpperCase();
    registrar('Atualizou dados da igreja', enderecoCompleto()); salvar(); toast('Dados da igreja atualizados.', 'ok'); render();
  },
  fin(d) {
    if (papel() !== 'admin') return;
    db.config.saldoInicial = Number(d.saldoInicial) || 0; db.config.meta = Math.max(0, Number(d.meta) || 0);
    registrar('Atualizou configurações financeiras', `Saldo inicial ${brl(db.config.saldoInicial)} · Meta ${brl(db.config.meta)}`); salvar(); toast('Configurações financeiras salvas.', 'ok');
  },
  async conta(d) {
    const nome = d.nome.trim(); if (!nome) return;
    try { await updateDoc(doc(fs, 'users', usuario.id), { nome }); await updateProfile(auth.currentUser, { displayName: nome }); }
    catch (e) { return toast('Não foi possível salvar o nome.', 'err'); }
    usuario.nome = nome; registrar('Alterou o próprio nome', nome); salvar(); renderUser(); render(); toast('Nome atualizado.', 'ok');
  },
  async senha(d, f) {
    if (d.nova.length < 6) return toast('A nova senha precisa ter pelo menos 6 caracteres.', 'warn');
    if (d.nova !== d.nova2) return toast('As senhas não conferem.', 'warn');
    try {
      await reauthenticateWithCredential(auth.currentUser, EmailAuthProvider.credential(auth.currentUser.email, d.atual));
      await updatePassword(auth.currentUser, d.nova);
    } catch (e) { return toast(e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password' ? 'Senha atual incorreta.' : msgAuth(e), 'err'); }
    registrar('Alterou a própria senha'); salvar(); f.reset(); toast('Senha alterada com sucesso.', 'ok');
  },
  async notif(d) {
    prefs.antecedencia = Number(d.antecedencia) || 30;
    prefs.notifNav = d.notifNav === 'on';
    if (prefs.notifNav && 'Notification' in window && Notification.permission === 'default') {
      try { await Notification.requestPermission(); } catch (e) { /* ignorado */ }
    }
    if (prefs.notifNav && (!('Notification' in window) || Notification.permission !== 'granted')) toast('O navegador não permitiu os avisos. Os avisos dentro do sistema continuam funcionando.', 'warn');
    else toast('Preferências de notificação salvas.', 'ok');
    salvarPrefs(); render(); verificarAlertas();
  },
};

/* =====================================================================
   ESTRUTURA, ROTAS E INICIALIZAÇÃO
   ===================================================================== */
const NAV = [
  { g: 'Principal', itens: [['painel', 'home', 'Painel'], ['cultos', 'calendar', 'Agenda de Cultos']] },
  { g: 'Financeiro', itens: [['financeiro', 'wallet', 'Dízimos e Ofertas'], ['despesas', 'receipt', 'Despesas'], ['relatorios', 'chart', 'Relatórios']] },
  { g: 'Pessoas', itens: [['membros', 'users', 'Membros'], ['eventos', 'sparkles', 'Eventos']] },
  { g: 'Sistema', itens: [['igreja', 'church', 'A Igreja'], ['config', 'sliders', 'Configurações'], ['admin', 'shield', 'Administração']] },
];
const ROTAS = {
  painel:     { t: 'Painel', s: 'Visão geral da igreja', v: vPainel },
  cultos:     { t: 'Agenda de Cultos', s: 'Programação e registro dos cultos', v: vCultos },
  financeiro: { t: 'Dízimos e Ofertas', s: 'Entradas do mês', v: vFinanceiro, part: tabEntradas },
  despesas:   { t: 'Despesas', s: 'Saídas do mês', v: vDespesas, part: tabDespesas },
  membros:    { t: 'Membros', s: 'Cadastro e acompanhamento', v: vMembros, part: tabMembros },
  eventos:    { t: 'Eventos', s: 'Agenda de eventos especiais', v: vEventos },
  relatorios: { t: 'Relatórios', s: 'Resumo financeiro e de cultos', v: vRelatorios },
  igreja:     { t: 'A Igreja', s: 'Informações, horários e localização', v: vIgreja },
  config:     { t: 'Configurações', s: 'Preferências da sua conta', v: vConfig },
  admin:      { t: 'Administração', s: 'Usuários, dados e segurança', v: vAdmin, part: () => (ui.adminTab === 'log' ? admLogTabela() : '') },
  membro:     { t: 'Perfil do membro', s: 'Informações, vida cristã e participação', v: () => vPerfil(rotaParam) },
};
let rotaParam = '';
function renderNav() {
  const hIso = iso(hoje()), agora = new Date();
  const temCultoHoje = cultosDoDia(hoje()).some(c => fimDoCulto(c) > agora);
  const evProx = db.eventos.filter(e => { const d = diasAte(e.data); return d >= 0 && d <= 7; }).length;
  $('#nav').innerHTML = NAV.map(g => {
    const itens = g.itens.filter(([r]) => pode(r));
    if (!itens.length) return '';
    const meu = g.g === 'Pessoas' && usuario.membroId ? [['membro/' + usuario.membroId, 'user', 'Meu perfil']] : [];
    return `<div class="nav-g">${g.g}</div>` + [...meu, ...itens].map(([r, i, l]) => {
      const extra = r === 'cultos' && temCultoHoje ? '<span class="nav-dot"></span>' : r === 'eventos' && evProx ? `<span class="nav-badge">${evProx}</span>` : r === 'admin' && db.usuarios.some(u => u.papel === 'pendente') ? `<span class="nav-badge">${db.usuarios.filter(u => u.papel === 'pendente').length}</span>` : '';
      const ativo = rotaAtual === r || (r === 'membros' && rotaAtual === 'membro' && rotaParam !== usuario.membroId) || r === 'membro/' + rotaParam && rotaAtual === 'membro';
      return `<a href="#${r}" class="nav-a ${ativo ? 'active' : ''}" data-tip="${l}" data-tip-mini>${ic(i)}<span class="lbl">${l}</span>${extra}</a>`;
    }).join('');
  }).join('');
  const prox = proximosCultos(1)[0];
  $('#sbNext').innerHTML = prox ? `<button class="sb-next" style="--c1:${prox.cor};--c2:${prox.cor2}" data-act="abrirCulto" data-key="${prox.key}"><small>${prox.data === hIso ? 'Hoje' : 'Próximo culto'}</small><b>${esc(prox.nome)}</b><span>${DIAS_C[parse(prox.data).getDay()]}, ${fmtDM(prox.data)} · ${prox.inicio}</span>${ic(prox.ic)}</button>` : '';
}
function renderUser() {
  if (!usuario) return;
  const mb = db.membros.find(x => x.id === usuario.membroId);
  $('#sbUser').innerHTML = `${avatar(usuario.nome, '', mb && mb.foto)}<span class="who"><b>${esc(usuario.nome)}</b><small>${usuario.geral ? 'Administrador geral' : (PAPEIS[usuario.papel] || PAPEIS.pendente).nome}</small></span><button class="icon-btn" data-act="sair" data-tip="Sair" aria-label="Sair do sistema">${ic('logout')}</button>`;
  const top = $('#topAdd');
  top.innerHTML = edita('financeiro') ? `<button class="btn primary" data-act="novaEntrada">${ic('plus')}<span class="top-lbl">Lançar</span></button>` : edita('membros') ? `<button class="btn primary" data-act="novoMembro">${ic('plus')}<span class="top-lbl">Membro</span></button>` : '';
}
function render(animar = true) {
  if (!usuario) return;
  let [nome, param = ''] = (location.hash.slice(1) || 'painel').split('/');
  if (!ROTAS[nome]) nome = 'painel';
  const permitido = nome === 'membro' ? (pode('membros') || (param && param === usuario.membroId)) : pode(nome);
  if (!permitido) { nome = 'painel'; param = ''; history.replaceState(null, '', '#painel'); }
  const trocou = nome !== rotaAtual || param !== rotaParam;
  rotaAtual = nome; rotaParam = param;
  const r = ROTAS[nome];
  const mb = nome === 'membro' ? db.membros.find(x => x.id === param) : null;
  $('#pageTitle').textContent = mb ? mb.nome : r.t;
  $('#pageSub').textContent = r.s;
  document.title = `${mb ? mb.nome : r.t} · AD Extensão de Oriximiná`;
  renderNav(); renderUser();
  const v = $('#view'), y = scrollY;
  v.innerHTML = r.v();
  if (animar || trocou) { v.classList.remove('enter'); void v.offsetWidth; v.classList.add('enter'); animarNumeros(v); }
  else { v.classList.remove('enter'); scrollTo(0, y); }
  tick(); atualizarSino();
  const imp = $('#importFile'); if (imp) imp.addEventListener('change', importar);
}
function importar(ev) {
  const file = ev.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const d = JSON.parse(reader.result);
      if (!d || !Array.isArray(d.membros) || !Array.isArray(d.entradas)) throw new Error('formato');
      if (!confirm('Restaurar este backup? Os dados atuais serão substituídos. As contas de usuário atuais são mantidas.')) return;
      const usuarios = db.usuarios; db = normalizar(d); db.usuarios = usuarios;
      registrar('Restaurou backup', file.name); salvar(); render(); toast('Backup restaurado.', 'ok');
    } catch (e) { toast('Arquivo de backup inválido.', 'err'); }
  };
  reader.readAsText(file);
}
const artAuth = () => { const g = IG(); return `
  <section class="auth-art" style="background-image:url('img/igreja.jpg')">
    <img src="img/logo.png" class="logo" alt="Logo da Assembleia de Deus – Extensão de Oriximiná">
    <h2>${esc(g.nome)}</h2>
    <p class="tag">${esc(g.extensao)} · desde ${esc(g.desde)}</p>
    <p class="addr">${ic('pin')} ${esc(enderecoCompleto())}</p>
    <div class="chips"><span class="chip">Dom 08h · EBD</span><span class="chip">Dom 19h30 · Culto</span><span class="chip">Qua 19h30 · Treinamento</span><span class="chip">Sex 19h30 · Oração</span><span class="chip">Sáb 07h · Círculo de Oração</span></div>
  </section>`; };
function mostrarAuth(html) {
  $('#app').hidden = true;
  const a = $('#auth'); a.hidden = false;
  a.innerHTML = artAuth() + `<section class="auth-side"><div class="auth-card">${html}</div></section>`;
  const f = a.querySelector('input'); if (f) f.focus();
}
function telaAuth(modo = 'login') {
  const T = {
    login: ['Área restrita', 'Entrar no sistema', 'Use seu e-mail e senha.', 'lock', 'Entrar'],
    criar: ['Novo acesso', 'Criar minha conta', 'Depois de criar, um administrador libera o seu acesso.', 'user', 'Criar conta'],
    esqueci: ['Recuperar acesso', 'Esqueci minha senha', 'Enviaremos um link para você criar uma nova senha.', 'key', 'Enviar link'],
  }[modo] || [];
  mostrarAuth(`
    <span class="auth-badge">${ic('shield')} ${T[0]}</span>
    <h1>${T[1]}</h1><p>${T[2]}</p>
    <form data-form="${modo}" autocomplete="on">
      ${modo === 'criar' ? campo('Seu nome completo', inp('nome', '', 'text', 'required autocomplete="name"')) : ''}
      ${campo('E-mail', inp('email', '', 'email', 'required autocomplete="email" autocapitalize="none" spellcheck="false"'))}
      ${modo !== 'esqueci' ? campo('Senha', pwField('senha', modo === 'criar' ? 'new-password' : 'current-password', 'required')) : ''}
      ${modo === 'criar' ? campo('Confirmar senha', pwField('senha2', 'new-password', 'required')) : ''}
      ${modo === 'login' ? `<label class="check"><input type="checkbox" name="lembrar" checked> Manter conectado neste aparelho</label>` : ''}
      <div class="auth-err" id="authErr" role="alert"></div>
      <button class="btn primary lg" type="submit">${ic(T[3])} ${T[4]}</button>
    </form>
    <div class="auth-links">
      ${modo === 'login' ? `<button class="lnk" data-act="authModo" data-v="esqueci">Esqueci minha senha</button><button class="lnk" data-act="authModo" data-v="criar">Criar conta</button>` : `<button class="lnk" data-act="authModo" data-v="login">${ic('left')} Voltar para entrar</button>`}
    </div>
    <p class="auth-note">${ic('lock')} Dados protegidos na nuvem (Google Firebase).</p>`);
}
function telaPendente() {
  const u = auth.currentUser; if (!u) return telaAuth();
  mostrarAuth(`
    <span class="auth-badge">${ic('clock')} Aguardando liberação</span>
    <h1>Olá, ${esc((u.displayName || u.email || '').split(' ')[0])}!</h1>
    <p>Sua conta <b>${esc(u.email)}</b> foi criada. ${usuario && usuario.ativo === false ? 'Ela está <b>desativada</b> no momento.' : 'Um administrador precisa liberar o seu acesso.'}</p>
    <div class="pend-steps">
      <div class="${u.emailVerified ? 'ok' : ''}">${ic(u.emailVerified ? 'check' : 'msg')}<span><b>Confirmar e-mail</b><small>${u.emailVerified ? 'E-mail confirmado.' : 'Abra o link que enviamos para o seu e-mail (veja também o spam).'}</small></span></div>
      <div>${ic('shield')}<span><b>Liberação do administrador</b><small>Assim que for liberado, toque em "Verificar novamente".</small></span></div>
    </div>
    <div class="auth-err" id="authErr" role="alert"></div>
    <div class="form-actions" style="justify-content:stretch;flex-direction:column">
      <button class="btn primary lg" data-act="jaConfirmei">${ic('check')} Verificar novamente</button>
      ${u.emailVerified ? '' : `<button class="btn" data-act="reenviarVerif">${ic('msg')} Reenviar e-mail de confirmação</button>`}
      <button class="btn" data-act="sair">${ic('logout')} Sair</button>
    </div>`);
}
let nomeCadastro = '';
async function entrarComo(user) {
  const ref = doc(fs, 'users', user.uid);
  let snap;
  try { snap = await getDoc(ref); } catch (e) { mostrarAuth(`<h1>Sem conexão</h1><p>Não foi possível falar com o servidor (${esc(e.code || 'erro')}).</p><button class="btn primary lg" data-act="jaConfirmei">Tentar de novo</button><button class="btn" data-act="sair" style="margin-top:8px">Sair</button>`); return; }
  const agora = new Date().toISOString();
  const basico = { nome: nomeCadastro || user.displayName || user.email.split('@')[0], email: user.email, ativo: true, membroId: '', criado: agora, ultimoAcesso: agora };
  if (!snap.exists()) {
    // Administrador geral: as regras do servidor só aceitam se o e-mail estiver confirmado
    try { await setDoc(ref, { ...basico, papel: 'admin', geral: true }); }
    catch (e) { await setDoc(ref, { ...basico, papel: 'pendente', geral: false }); }
    snap = await getDoc(ref);
  } else if (snap.data().papel === 'pendente' && user.emailVerified) {
    try { await updateDoc(ref, { papel: 'admin', geral: true }); snap = await getDoc(ref); } catch (e) { /* conta comum: segue pendente */ }
  }
  nomeCadastro = '';
  usuario = { ...snap.data(), id: user.uid };
  if (!PAPEIS[usuario.papel] || usuario.papel === 'pendente' || usuario.ativo === false) { pararListeners(); telaPendente(); return; }
  updateDoc(ref, { ultimoAcesso: agora }).catch(() => {});
  db = normalizar({});
  base = { membros: new Map(), entradas: new Map(), despesas: new Map(), eventos: new Map(), cultos: new Map(), log: new Map(), config: '' };
  const ultimo = snap.data().ultimoAcesso;
  iniciarListeners();
  if (!ultimo || Date.now() - new Date(ultimo) > 3600000) { registrar('Entrou no sistema'); salvar(); }
  iniciarApp();
}
function iniciarApp() {
  const a = $('#auth'); a.hidden = true; a.innerHTML = '';
  $('#app').hidden = false;
  renderUser();
  if (!location.hash || location.hash === '#') history.replaceState(null, '', '#painel');
  render();
  verificarAlertas();
  const agora = new Date(), hc = cultosDoDia(hoje()).filter(c => fimDoCulto(c) > agora);
  if (hc.length) setTimeout(() => toast(`Hoje: ${hc.map(c => `${c.nome} às ${c.inicio}`).join(' · ')}`, 'info'), 700);
}

/* ---------- Eventos globais ---------- */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (el) { const fn = ACT[el.dataset.act]; if (fn) { if (el.tagName !== 'A' || el.dataset.act !== 'irAdminIgreja') e.preventDefault(); fn(el.dataset, el); if (el.closest('#sidebar') && innerWidth <= 900) document.body.classList.remove('menu-open'); return; } }
  const p = $('#notifPanel');
  if (!p.hidden && !e.target.closest('#notifPanel') && !e.target.closest('#bellBtn')) p.hidden = true;
});
document.addEventListener('submit', async e => {
  const f = e.target.closest('form[data-form]'); if (!f) return;
  e.preventDefault();
  const fn = FORMS[f.dataset.form]; if (!fn) return;
  const btn = f.querySelector('[type=submit]'); if (btn) btn.disabled = true;
  try { await fn(Object.fromEntries(new FormData(f)), f); }
  catch (err) { console.error(err); toast('Algo deu errado. Tente novamente.', 'err'); }
  finally { if (btn && btn.isConnected) btn.disabled = false; }
});
document.addEventListener('input', e => {
  const el = e.target.closest('[data-filter]'); if (!el) return;
  ui.f[el.dataset.filter] = el.value;
  const r = ROTAS[rotaAtual], part = $('#part');
  if (r && r.part && part) part.innerHTML = r.part(); else render();
});
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); abrirPaleta(); return; }
  if (e.key === 'Escape') { fecharNotif(); document.body.classList.remove('menu-open'); }
  const tag = (e.target.tagName || '').toLowerCase();
  if (e.key === '[' && usuario && !['input', 'textarea', 'select'].includes(tag) && !modal.open) ACT.sidebarMini();
});
addEventListener('hashchange', () => { document.body.classList.remove('menu-open'); fecharNotif(); render(); scrollTo(0, 0); });
$('#backdrop').addEventListener('click', () => document.body.classList.remove('menu-open'));

/* ---------- Início ---------- */
$$('[data-ic]').forEach(el => { el.innerHTML = ic(el.dataset.ic); });
aplicarTema();
aplicarSidebar();
mostrarAuth(`<div class="empty">${ic('clock')}<span>Conectando…</span></div>`);
onAuthStateChanged(auth, user => {
  if (!user) { pararListeners(); usuario = null; db = normalizar({}); telaAuth(); return; }
  entrarComo(user);
});
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
setInterval(tick, 1000);
setInterval(verificarAlertas, 30000);
setInterval(() => { if (usuario && !modal.open && rotaAtual === 'painel' && document.visibilityState === 'visible' && new Date().getSeconds() < 2) renderNav(); }, 1000);
