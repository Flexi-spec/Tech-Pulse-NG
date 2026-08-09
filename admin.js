const config = window.TP_CONFIG || {};
const supabaseClient = window.supabase.createClient(
  config.SUPABASE_URL,
  config.SUPABASE_ANON_KEY
);

const $ = (selector) => document.querySelector(selector);
const login = $("#login");
const dashboard = $("#dashboard");
const form = $("#loginForm");
const errorBox = $("#loginError");

async function init() {
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!session) {
    showLogin();
    return;
  }

  await verifyAdmin(session.user);
}

async function verifyAdmin(user) {
  clearError();

  const { data, error } = await supabaseClient
    .from("admin_users")
    .select("user_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    showLogin();
    errorBox.textContent = "Could not verify admin permissions.";
    return;
  }

  if (!data || !["admin", "researcher"].includes(data.role)) {
    await supabaseClient.auth.signOut();
    showLogin();
    errorBox.textContent =
      "Access denied: this account is not an authorized TechPulse admin.";
    return;
  }

  login.hidden = true;
  dashboard.hidden = false;
  $("#logout").hidden = false;

  await loadDashboard();
}

function showLogin() {
  login.hidden = false;
  dashboard.hidden = true;
  $("#logout").hidden = true;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  clearError();

  $("#loginBtn").disabled = true;
  $("#loginBtn").textContent = "Signing in...";

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: $("#email").value.trim(),
    password: $("#password").value
  });

  if (error) {
    errorBox.textContent = error.message;
  } else {
    await verifyAdmin(data.user);
  }

  $("#loginBtn").disabled = false;
  $("#loginBtn").textContent = "Sign in →";
});

$("#logout").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  showLogin();
});

$("#refresh").addEventListener("click", loadDashboard);

async function loadDashboard() {
  await Promise.all([
    loadOverview(),
    loadAgeAnalytics(),
    loadDomainAnalytics(),
    loadStateAnalytics(),
    loadDeviceAnalytics(),
    loadEducationAnalytics(),
    loadDailyAnalytics()
  ]);
}

async function loadOverview() {
  const { data, error } = await supabaseClient
    .from("analytics_overview")
    .select("*")
    .single();

  if (error) throw error;

  $("#total").textContent = data.total_submissions || 0;
  $("#avg").textContent = `${Math.round(data.average_score || 0)}%`;
}

async function loadAgeAnalytics() {
  const { data, error } = await supabaseClient
    .from("analytics_by_age")
    .select("*");

  if (error) throw error;

  const order = ["8-12", "13-19", "20-40", "50-80"];
  const rows = order.map(age => data.find(row => row.age_group === age)).filter(Boolean);

  const top = [...rows].sort(
    (a, b) => Number(b.average_score || 0) - Number(a.average_score || 0)
  )[0];

  $("#top").textContent = top?.age_group || "—";

  renderBars(
    "#ageChart",
    rows.map(row => ({
      label: row.age_group,
      value: Math.round(row.average_score || 0),
      percent: true
    }))
  );
}

async function loadDomainAnalytics() {
  const { data, error } = await supabaseClient
    .from("survey_responses")
    .select("category_scores");

  if (error) throw error;

  const domains = {
    device: [],
    information: [],
    security: [],
    communication: [],
    tools: []
  };

  (data || []).forEach(row => {
    Object.entries(row.category_scores || {}).forEach(([domain, score]) => {
      if (domains[domain]) domains[domain].push(Number(score));
    });
  });

  const names = {
    device: "Device & Software",
    information: "Information Literacy",
    security: "Safety & Security",
    communication: "Communication",
    tools: "Digital Tools"
  };

  const results = Object.entries(domains)
    .map(([domain, scores]) => ({
      label: names[domain],
      value: scores.length
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0,
      percent: true
    }))
    .sort((a, b) => b.value - a.value);

  $("#best").textContent = results[0]?.label || "—";
  renderBars("#domainChart", results);
}

async function loadStateAnalytics() {
  const { data, error } = await supabaseClient
    .from("analytics_by_state")
    .select("*")
    .order("total_submissions", { ascending: false })
    .limit(15);

  if (error) throw error;

  renderBars(
    "#stateChart",
    (data || []).map(row => ({
      label: row.state,
      value: Number(row.total_submissions)
    }))
  );
}

async function loadDeviceAnalytics() {
  const { data, error } = await supabaseClient
    .from("analytics_by_device")
    .select("*");

  if (error) throw error;

  renderBars(
    "#deviceChart",
    (data || []).map(row => ({
      label: row.device_used || "Unknown",
      value: Number(row.total_submissions)
    }))
  );
}

async function loadEducationAnalytics() {
  const { data, error } = await supabaseClient
    .from("analytics_by_education")
    .select("*");

  if (error) throw error;

  renderBars(
    "#educationChart",
    (data || []).map(row => ({
      label: row.education_level || "Unknown",
      value: Number(row.total_submissions)
    }))
  );
}

async function loadDailyAnalytics() {
  const { data, error } = await supabaseClient
    .from("analytics_daily")
    .select("*")
    .order("submission_date", { ascending: false })
    .limit(14);

  if (error) throw error;

  renderBars(
    "#dailyChart",
    (data || []).reverse().map(row => ({
      label: row.submission_date,
      value: Number(row.total_submissions)
    }))
  );
}

function renderBars(selector, items) {
  const element = $(selector);

  if (!items || !items.length) {
    element.innerHTML = '<p class="muted">No data available yet.</p>';
    return;
  }

  const max = Math.max(...items.map(item => item.value), 1);

  element.innerHTML = items.map(item => {
    const width = Math.max(3, (item.value / max) * 100);

    return `
      <div class="bar-row">
        <span>${escapeHTML(item.label)}</span>
        <div class="bar-track">
          <i style="width:${width}%"></i>
        </div>
        <b>${item.value}${item.percent ? "%" : ""}</b>
      </div>
    `;
  }).join("");
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

$("#export").addEventListener("click", async () => {
  const { data, error } = await supabaseClient
    .from("research_response_summary")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    alert(error.message);
    return;
  }

  if (!data?.length) {
    alert("No research data to export yet.");
    return;
  }

  const headers = [
    "created_at",
    "age_group",
    "state",
    "gender",
    "education_level",
    "device_used",
    "internet_access",
    "primary_internet_activity",
    "total_score",
    "literacy_level",
    "category_scores"
  ];

  const rows = data.map(row => [
    row.created_at,
    row.age_group,
    row.state,
    row.gender,
    row.education_level,
    row.device_used,
    row.internet_access,
    row.primary_internet_activity,
    row.total_score,
    row.literacy_level,
    JSON.stringify(row.category_scores)
  ]);

  const csv = [headers, ...rows]
    .map(row =>
      row.map(value =>
        `"${String(value ?? "").replaceAll('"', '""')}"`
      ).join(",")
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `techpulse-research-${new Date().toISOString().slice(0, 10)}.csv`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
});

supabaseClient.auth.onAuthStateChange((event, session) => {
  if (!session) showLogin();
});

init();
