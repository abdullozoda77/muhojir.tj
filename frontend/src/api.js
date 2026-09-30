import { lang, t } from "./i18n.js";

// API calls to Django with JWT tokens. Tokens are stored in localStorage.
const API = "/api";

function store(key, value) {
  try {
    if (value === undefined) return localStorage.getItem(key);
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    return null;
  }
}

export const tokens = {
  get access() {
    return store("access");
  },
  get refresh() {
    return store("refresh");
  },
  save({ access, refresh }) {
    if (access) store("access", access);
    if (refresh) store("refresh", refresh);
  },
  clear() {
    store("access", null);
    store("refresh", null);
  },
};

// Called when tokens are no longer valid, so the app can show the user as logged out.
let onLogout = () => {};
export function setLogoutHandler(handler) {
  onLogout = handler;
}

// A refresh token works only once (the server gives a new one and blocks the old), so when several requests
// find the access token expired at the same moment they all wait for one refresh instead of each sending theirs.
let refreshing = null;

function refreshAccessToken() {
  refreshing ??= (async () => {
    if (!tokens.refresh) return false;
    const res = await fetch(`${API}/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: tokens.refresh }),
    });
    if (!res.ok) return false;
    tokens.save(await res.json());
    return true;
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

// The server answers in English; these are the messages people can meet, in the site language.
const SERVER_MESSAGES = {
  "A code was just sent. Wait a minute before asking for a new one.": t("Рамз ҳозир фиристода шуд. Як дақиқа интизор шавед."),
  "The email could not be sent. Try again in a few minutes.": t("Мактуб фиристода нашуд. Баъд аз чанд дақиқа боз кӯшиш кунед."),
  "The code has expired. Ask for a new one.": t("Мӯҳлати рамз гузашт. Рамзи нав гиред."),
  "Too many wrong tries. Ask for a new code.": t("Кӯшишҳои хато зиёд шуданд. Рамзи нав гиред."),
  "Wrong code.": t("Рамз нодуруст аст."),
  "The code is 6 digits.": t("Рамз 6 рақам дорад."),
  "This account is blocked.": t("Ин ҳисоб баста шудааст."),
  "This phone number is already used by another account.": t("Ин рақами телефон аллакай дар ҳисоби дигар ҳаст."),
  "The end date must be after the issue date.": t("Санаи анҷом бояд баъд аз санаи додан бошад."),
  "You already have a company profile.": t("Шумо аллакай профили ширкат доред."),
  "Create a company profile before posting jobs.": t("Аввал профили ширкатро созед."),
  "Your company is on the blacklist and cannot post jobs.": t("Ширкати шумо дар рӯйхати сиёҳ аст ва эълон гузошта наметавонад."),
  "The top of the salary range is below the bottom.": t("Маоши «то» аз маоши «аз» кам аст."),
  "You cannot review your own company.": t("Ба ширкати худ баҳо додан мумкин нест."),
  "You already reviewed this employer. Edit that review instead.": t("Шумо аллакай ба ин корфармо баҳо додаед."),
  "You already have a resume. Edit it instead.": t("Шумо аллакай резюме доред."),
  "You cannot apply to your own company's job.": t("Ба кори ширкати худ ариза додан мумкин нест."),
  "This job is closed.": t("Ин ҷойи кор пӯшида аст."),
  "You already applied for this job.": t("Шумо ба ин кор аллакай ариза додаед."),
  "Only employer accounts can do this.": t("Инро танҳо корфармоён карда метавонанд."),
  "Only the worker who applied can withdraw the application.": t("Аризаро танҳо худи коргар бозпас гирифта метавонад."),
};

export function errorText(data) {
  if (!data) return "";
  if (typeof data === "string") return SERVER_MESSAGES[data] || data;
  if (Array.isArray(data)) return data.map(errorText).join(" ");
  if (data.detail) return errorText(data.detail);
  return Object.values(data).map(errorText).join(" ");
}

// api("/jobs/jobs/") or api("/documents/my-documents/", { method: "POST", body: {...} }). Bodies are sent as JSON.
export async function api(path, { method = "GET", body } = {}) {
  let sentWith = null;
  const send = () => {
    const headers = { "Accept-Language": lang === "ru" ? "ru" : "tg" };
    if (body) headers["Content-Type"] = "application/json";
    sentWith = tokens.access;
    if (sentWith) headers.Authorization = `Bearer ${sentWith}`;
    return fetch(API + path, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}) });
  };

  let res;
  try {
    res = await send();
  } catch {
    throw Object.assign(new Error(t("Интернет нест ё сервер ҷавоб намедиҳад.")), { status: 0 });
  }
  if (res.status === 401) {
    const hadToken = Boolean(tokens.access);
    if (hadToken && tokens.access !== sentWith) {
      // Another request has already got a new token while this one was on its way: just repeat it.
      res = await send();
    } else if (hadToken && (await refreshAccessToken())) {
      res = await send();
    } else {
      // The saved login is gone or expired: show the site as logged out and repeat as a guest,
      // so public data (jobs, news) still loads.
      tokens.clear();
      onLogout();
      if (hadToken) res = await send();
    }
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const message = res.status === 401 && !path.startsWith("/auth/") ? t("Лутфан аз нав ворид шавед.") : errorText(data);
    const error = new Error(message || t("Хатогӣ {0}", res.status));
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

// Every list endpoint is paginated ({count, results}); this reads all pages (for short lists like regions).
export async function apiAll(path) {
  const sep = path.includes("?") ? "&" : "?";
  let page = await api(`${path}${sep}page_size=100`);
  const results = [...page.results];
  while (page.next) {
    page = await api(page.next.slice(page.next.indexOf(API) + API.length));
    results.push(...page.results);
  }
  return results;
}
