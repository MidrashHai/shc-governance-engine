/**
 * SHC™ Governance Engine · v1.0
 * Makom Intelligence™ · SHC-FAMILY-DEV-001
 *
 * Serveur de gouvernance temporelle · Node.js
 * Scheduler · Governance Engine™ · Policy Pusher → Google Android Management API
 */

require('dotenv').config();
const express = require('express');
const cron    = require('node-cron');
const cors    = require('cors');
const { google } = require('googleapis');

const app = express();
app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════
const CONFIG = {
  enterpriseName : process.env.ENTERPRISE_NAME || 'enterprises/LC02yo9pv4',
  projectId      : process.env.PROJECT_ID      || 'heroic-district-396607',
  port           : process.env.PORT            || 3000,
  timezone       : process.env.TIMEZONE        || 'Europe/Paris',
};

// Chargement des credentials JSON depuis variable d'environnement
let serviceAccountKey = null;
if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
  serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
}

// ═══════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════
const CATEGORIES = ['SOCIAL','VIDEO','GAME','EDUCATION','READING','COMMUNICATION','PRODUCTIVITY','SYSTEM'];
const JOURS_WEEKEND = ['Samedi','Dimanche'];
const JOURS_SEMAINE = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];

// Catalogue d'applications par catégorie
const APP_CATALOGUE = {
  SOCIAL: [
    'com.instagram.android',
    'com.facebook.katana',
    'com.snapchat.android',
    'com.zhiliaoapp.musically',
    'com.twitter.android',
    'com.pinterest',
    'com.whatsapp',
    'org.telegram.messenger',
    'com.discord',
  ],
  VIDEO: [
    'com.google.android.youtube',
    'com.netflix.mediaclient',
    'com.amazon.avod.thirdpartyclient',
    'com.disney.disneyplus',
    'tv.twitch.android.app',
    'com.google.android.youtube.kids',
  ],
  GAME: [
    'com.supercell.clashofclans',
    'com.mojang.minecraftpe',
    'com.roblox.client',
    'com.king.candycrushsaga',
    'com.supercell.brawlstars',
    'com.epicgames.fortnite',
    'com.activision.callofduty.shooter',
  ],
  EDUCATION: [
    'com.duolingo',
    'com.khanacademy.android',
    'com.quizlet.quizletapp',
  ],
  READING: [
    'com.amazon.kindle',
    'com.google.android.apps.books',
  ],
  COMMUNICATION: [
    'com.google.android.gm',
    'com.microsoft.teams',
    'com.zoom.videomeetings',
  ],
  PRODUCTIVITY: [
    'com.microsoft.office.word',
    'com.google.android.apps.docs',
    'com.microsoft.office.excel',
  ],
  SYSTEM: [],
};

// ═══════════════════════════════════════════════
// RULE STORE · Base de règles SHC™ Family
// ═══════════════════════════════════════════════
let ruleStore = [
  // ÉCOLIER · Scolaire Lun/Mar/Jeu/Ven
  { id:'R-E01', profil:'Ecolier', periodes:['SCOLAIRE'], jours:['Lundi','Mardi','Jeudi','Vendredi'], start:'20:00', end:'07:00', cat:'SOCIAL', dec:'BLOCK', enabled:true },
  { id:'R-E02', profil:'Ecolier', periodes:['SCOLAIRE'], jours:['Lundi','Mardi','Jeudi','Vendredi'], start:'20:00', end:'07:00', cat:'VIDEO',  dec:'BLOCK', enabled:true },
  { id:'R-E03', profil:'Ecolier', periodes:['SCOLAIRE'], jours:['Lundi','Mardi','Jeudi','Vendredi'], start:'20:00', end:'07:00', cat:'GAME',   dec:'BLOCK', enabled:true },
  // ÉCOLIER · Mercredi demi-weekend
  { id:'R-E04', profil:'Ecolier', periodes:['SCOLAIRE'], jours:['Mercredi'], start:'21:00', end:'08:00', cat:'SOCIAL', dec:'BLOCK', enabled:true },
  { id:'R-E05', profil:'Ecolier', periodes:['SCOLAIRE'], jours:['Mercredi'], start:'21:00', end:'08:00', cat:'VIDEO',  dec:'BLOCK', enabled:true },
  { id:'R-E06', profil:'Ecolier', periodes:['SCOLAIRE'], jours:['Mercredi'], start:'21:00', end:'08:00', cat:'GAME',   dec:'BLOCK', enabled:true },
  // ÉCOLIER · Weekend
  { id:'R-E07', profil:'Ecolier', periodes:['WEEKEND'],  jours:[], start:'21:00', end:'08:00', cat:'SOCIAL', dec:'BLOCK', enabled:true },
  { id:'R-E08', profil:'Ecolier', periodes:['WEEKEND'],  jours:[], start:'21:00', end:'08:00', cat:'VIDEO',  dec:'BLOCK', enabled:true },
  { id:'R-E09', profil:'Ecolier', periodes:['WEEKEND'],  jours:[], start:'21:00', end:'08:00', cat:'GAME',   dec:'BLOCK', enabled:true },
  // ÉCOLIER · Congés
  { id:'R-E10', profil:'Ecolier', periodes:['CONGES'],   jours:[], start:'21:30', end:'08:00', cat:'SOCIAL', dec:'BLOCK', enabled:true },
  { id:'R-E11', profil:'Ecolier', periodes:['CONGES'],   jours:[], start:'21:30', end:'08:00', cat:'VIDEO',  dec:'BLOCK', enabled:true },
  { id:'R-E12', profil:'Ecolier', periodes:['CONGES'],   jours:[], start:'21:30', end:'08:00', cat:'GAME',   dec:'BLOCK', enabled:true },
  // ÉLÈVE · Scolaire
  { id:'R-L01', profil:'Eleve', periodes:['SCOLAIRE'], jours:['Lundi','Mardi','Mercredi','Jeudi','Vendredi'], start:'21:00', end:'07:00', cat:'SOCIAL', dec:'BLOCK', enabled:true },
  { id:'R-L02', profil:'Eleve', periodes:['SCOLAIRE'], jours:['Lundi','Mardi','Mercredi','Jeudi','Vendredi'], start:'21:00', end:'07:00', cat:'VIDEO',  dec:'BLOCK', enabled:true },
  { id:'R-L03', profil:'Eleve', periodes:['SCOLAIRE'], jours:['Lundi','Mardi','Mercredi','Jeudi','Vendredi'], start:'21:00', end:'07:00', cat:'GAME',   dec:'BLOCK', enabled:true },
  // ÉLÈVE · Weekend
  { id:'R-L04', profil:'Eleve', periodes:['WEEKEND'], jours:[], start:'22:00', end:'08:00', cat:'SOCIAL', dec:'BLOCK', enabled:true },
  { id:'R-L05', profil:'Eleve', periodes:['WEEKEND'], jours:[], start:'22:00', end:'08:00', cat:'VIDEO',  dec:'BLOCK', enabled:true },
  // ÉLÈVE · Congés
  { id:'R-L06', profil:'Eleve', periodes:['CONGES'], jours:[], start:'22:30', end:'08:00', cat:'SOCIAL', dec:'BLOCK', enabled:true },
  { id:'R-L07', profil:'Eleve', periodes:['CONGES'], jours:[], start:'22:30', end:'08:00', cat:'VIDEO',  dec:'BLOCK', enabled:true },
  // ÉTUDIANT · Scolaire
  { id:'R-T01', profil:'Etudiant', periodes:['SCOLAIRE'], jours:['Lundi','Mardi','Mercredi','Jeudi','Vendredi'], start:'22:00', end:'07:00', cat:'SOCIAL', dec:'BLOCK', enabled:true },
  { id:'R-T02', profil:'Etudiant', periodes:['SCOLAIRE'], jours:['Lundi','Mardi','Mercredi','Jeudi','Vendredi'], start:'22:00', end:'07:00', cat:'VIDEO',  dec:'BLOCK', enabled:true },
  // ÉTUDIANT · Weekend
  { id:'R-T03', profil:'Etudiant', periodes:['WEEKEND'], jours:[], start:'23:00', end:'08:00', cat:'SOCIAL', dec:'BLOCK', enabled:true },
  // ÉTUDIANT · Congés
  { id:'R-T04', profil:'Etudiant', periodes:['CONGES'], jours:[], start:'23:00', end:'08:00', cat:'SOCIAL', dec:'BLOCK', enabled:true },
];

// Configuration Pâques (configurable via API)
let paquesConfig = {
  start: new Date('2026-04-11'),
  end:   new Date('2026-04-26'),
};

// État des politiques déployées · cache
let deployedPolicies = {};

// Journal des décisions
let governanceLog = [];

// ═══════════════════════════════════════════════
// CONTEXT ENGINE™
// ═══════════════════════════════════════════════
function buildContext(profil, now = new Date()) {
  const jour = JOURS_SEMAINE[now.getDay()];
  const h    = now.getHours();
  const m    = now.getMinutes();
  const timeMinutes = h * 60 + m;
  const periode = computePeriode(jour, profil, now);
  return { profil, jour, timeMinutes, time: `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`, periode, timestamp: now.toISOString() };
}

function computePeriode(jour, profil, now) {
  const d = new Date(now); d.setHours(0,0,0,0);
  if (d >= paquesConfig.start && d <= paquesConfig.end) return 'CONGES';
  const isWE = JOURS_WEEKEND.includes(jour);
  const isMercrediEcolier = jour === 'Mercredi' && profil === 'Ecolier';
  if (isWE || isMercrediEcolier) return 'WEEKEND';
  return 'SCOLAIRE';
}

function timeInRange(startStr, endStr, nowMin) {
  const [sh, sm] = startStr.split(':').map(Number);
  const [eh, em] = endStr.split(':').map(Number);
  const start = sh * 60 + sm;
  const end   = eh * 60 + em;
  if (start <= end) return nowMin >= start && nowMin <= end;
  return nowMin >= start || nowMin <= end;
}

// ═══════════════════════════════════════════════
// GOVERNANCE ENGINE™
// ═══════════════════════════════════════════════
function runGovernance(ctx) {
  const decisions    = {};
  const appliedRules = {};
  CATEGORIES.forEach(cat => { decisions[cat] = 'ALLOW'; appliedRules[cat] = null; });

  const applicable = ruleStore.filter(r => {
    if (!r.enabled) return false;
    if (r.profil !== 'All' && r.profil !== ctx.profil) return false;
    if (r.periodes && r.periodes.length > 0 && !r.periodes.includes(ctx.periode)) return false;
    if (r.jours && r.jours.length > 0 && !r.jours.includes(ctx.jour)) return false;
    return timeInRange(r.start, r.end, ctx.timeMinutes);
  });

  applicable.forEach(rule => {
    if (rule.dec === 'BLOCK') {
      decisions[rule.cat] = 'BLOCK';
      appliedRules[rule.cat] = rule.id;
    } else if (decisions[rule.cat] !== 'BLOCK') {
      decisions[rule.cat] = 'ALLOW';
      appliedRules[rule.cat] = rule.id;
    }
  });

  return { decisions, appliedRules, rulesApplied: applicable.length };
}

// ═══════════════════════════════════════════════
// POLICY BUILDER
// Construit le payload Google à partir des décisions
// ═══════════════════════════════════════════════
function buildGooglePolicy(govResult, profil, ctx) {
  const blockedApps = [];

  CATEGORIES.forEach(cat => {
    if (govResult.decisions[cat] === 'BLOCK') {
      const apps = APP_CATALOGUE[cat] || [];
      apps.forEach(pkg => {
        if (!blockedApps.find(a => a.packageName === pkg)) {
          blockedApps.push({ packageName: pkg, installType: 'BLOCKED' });
        }
      });
    }
  });

  return {
    applications: blockedApps,
    addUserDisabled: true,
    screenCaptureDisabled: false,
    policyEnforced: true,
  };
}

// ═══════════════════════════════════════════════
// POLICY PUSHER → Google Android Management API
// ═══════════════════════════════════════════════
async function getAndroidManagementClient() {
  if (!serviceAccountKey) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON non configuré · mode simulation activé');
  }
  const auth = new google.auth.GoogleAuth({
    credentials: serviceAccountKey,
    scopes: ['https://www.googleapis.com/auth/androidmanagement'],
  });
  return google.androidmanagement({ version: 'v1', auth });
}

async function pushPolicy(profil, policyPayload, ctx) {
  const policyName = `${CONFIG.enterpriseName}/policies/SHC-${profil}-${ctx.periode}`;

  // Mode simulation si pas de credentials
  if (!serviceAccountKey) {
    console.log(`[SIMULATION] PATCH ${policyName}`);
    console.log(`[SIMULATION] Apps bloquées : ${policyPayload.applications.length}`);
    return { simulated: true, policyName };
  }

  try {
    const client = await getAndroidManagementClient();
    const result = await client.enterprises.policies.patch({
      name: policyName,
      requestBody: policyPayload,
    });
    console.log(`[PUSH] ✓ ${policyName} · ${policyPayload.applications.length} apps bloquées`);
    return result.data;
  } catch (err) {
    console.error(`[PUSH] ✗ ${policyName} · ${err.message}`);
    throw err;
  }
}

// ═══════════════════════════════════════════════
// SCHEDULER · Cœur du Governance Engine™
// Exécuté toutes les minutes
// ═══════════════════════════════════════════════
const PROFILS = ['Ecolier', 'Eleve', 'Etudiant'];

async function runGovernanceCycle() {
  const now = new Date();
  const cycleId = now.toISOString();
  const changes = [];

  for (const profil of PROFILS) {
    const ctx     = buildContext(profil, now);
    const gov     = runGovernance(ctx);
    const payload = buildGooglePolicy(gov, profil, ctx);

    // Clé de cache pour ce profil + période
    const cacheKey = `${profil}-${ctx.periode}`;
    const prev     = deployedPolicies[cacheKey];

    // Sérialiser pour comparaison
    const newHash = JSON.stringify(payload.applications.map(a => a.packageName).sort());
    const oldHash = prev ? JSON.stringify(prev.apps) : null;

    if (newHash !== oldHash) {
      // La politique a changé · on push
      try {
        await pushPolicy(profil, payload, ctx);
        deployedPolicies[cacheKey] = {
          apps: payload.applications.map(a => a.packageName).sort(),
          updatedAt: cycleId,
          ctx,
        };
        changes.push({
          profil,
          periode: ctx.periode,
          jour: ctx.jour,
          time: ctx.time,
          blocked: payload.applications.length,
          rulesApplied: gov.rulesApplied,
        });
      } catch (err) {
        console.error(`[CYCLE] Erreur push ${profil} : ${err.message}`);
      }
    }
  }

  if (changes.length > 0) {
    const logEntry = { cycleId, changes, timestamp: cycleId };
    governanceLog.unshift(logEntry);
    if (governanceLog.length > 200) governanceLog.pop();
    console.log(`[CYCLE] ${changes.length} politique(s) mise(s) à jour · ${cycleId}`);
  }

  return changes;
}

// ═══════════════════════════════════════════════
// SCHEDULER · toutes les minutes
// ═══════════════════════════════════════════════
let schedulerActive = false;

function startScheduler() {
  if (schedulerActive) return;
  schedulerActive = true;
  console.log('[SCHEDULER] Démarré · cycle toutes les minutes');

  // Exécution immédiate au démarrage
  runGovernanceCycle().catch(console.error);

  // Puis toutes les minutes
  cron.schedule('* * * * *', () => {
    runGovernanceCycle().catch(console.error);
  }, { timezone: CONFIG.timezone });
}

// ═══════════════════════════════════════════════
// API REST · Endpoints
// ═══════════════════════════════════════════════

// GET /health · Santé du serveur
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    engine: 'SHC-Governance-Engine',
    enterprise: CONFIG.enterpriseName,
    scheduler: schedulerActive,
    timestamp: new Date().toISOString(),
    mode: serviceAccountKey ? 'PRODUCTION' : 'SIMULATION',
  });
});

// GET /context/:profil · Contexte actuel pour un profil
app.get('/context/:profil', (req, res) => {
  const ctx = buildContext(req.params.profil);
  const gov = runGovernance(ctx);
  res.json({ ctx, governance: gov });
});

// GET /policy/:profil · Politique calculée pour un profil
app.get('/policy/:profil', (req, res) => {
  const profil  = req.params.profil;
  const ctx     = buildContext(profil);
  const gov     = runGovernance(ctx);
  const payload = buildGooglePolicy(gov, profil, ctx);
  res.json({
    profil,
    ctx,
    governance: gov,
    policy: payload,
    blockedCount: payload.applications.length,
  });
});

// POST /policy/:profil/push · Forcer un push immédiat
app.post('/policy/:profil/push', async (req, res) => {
  const profil  = req.params.profil;
  const ctx     = buildContext(profil);
  const gov     = runGovernance(ctx);
  const payload = buildGooglePolicy(gov, profil, ctx);
  try {
    const result = await pushPolicy(profil, payload, ctx);
    res.json({ success: true, profil, blockedCount: payload.applications.length, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /rules · Liste toutes les règles
app.get('/rules', (req, res) => {
  res.json({ count: ruleStore.length, rules: ruleStore });
});

// POST /rules · Ajouter une règle
app.post('/rules', (req, res) => {
  const rule = { id: `R-${Date.now()}`, enabled: true, ...req.body };
  ruleStore.push(rule);
  res.json({ success: true, rule });
});

// DELETE /rules/:id · Supprimer une règle
app.delete('/rules/:id', (req, res) => {
  const before = ruleStore.length;
  ruleStore = ruleStore.filter(r => r.id !== req.params.id);
  res.json({ success: ruleStore.length < before, remaining: ruleStore.length });
});

// GET /log · Journal des décisions
app.get('/log', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  res.json({ count: governanceLog.length, log: governanceLog.slice(0, limit) });
});

// GET /deployed · État des politiques déployées
app.get('/deployed', (req, res) => {
  res.json({ deployed: deployedPolicies });
});

// PUT /paques · Configurer les congés Pâques
app.put('/paques', (req, res) => {
  const { start, end } = req.body;
  paquesConfig = { start: new Date(start), end: new Date(end) };
  res.json({ success: true, paques: paquesConfig });
});

// POST /scheduler/trigger · Déclencher un cycle manuel
app.post('/scheduler/trigger', async (req, res) => {
  const changes = await runGovernanceCycle();
  res.json({ success: true, changes });
});

// ═══════════════════════════════════════════════
// DÉMARRAGE
// ═══════════════════════════════════════════════
app.listen(CONFIG.port, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   SHC™ Governance Engine · v1.0              ║');
  console.log('║   Makom Intelligence™ · SHC-FAMILY-DEV-001   ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
  console.log(`[SERVER] Port        : ${CONFIG.port}`);
  console.log(`[SERVER] Enterprise  : ${CONFIG.enterpriseName}`);
  console.log(`[SERVER] Timezone    : ${CONFIG.timezone}`);
  console.log(`[SERVER] Mode        : ${serviceAccountKey ? 'PRODUCTION' : 'SIMULATION'}`);
  console.log(`[SERVER] Règles      : ${ruleStore.length} règles chargées`);
  console.log('');
  startScheduler();
});

module.exports = app;
