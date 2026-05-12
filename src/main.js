import { hasSupabaseCredentials, supabase } from "./supabaseClient.js";

const topicPanel = document.getElementById("topic-panel");
const tabs = document.querySelectorAll(".tab");

const signupForm = document.getElementById("signup-form");
const loginForm = document.getElementById("login-form");
const logoutButton = document.getElementById("logout-button");
const authStatus = document.getElementById("auth-status");
const sessionChip = document.getElementById("session-chip");
const authTabs = document.querySelectorAll(".auth-tab");
const authPanels = document.querySelectorAll(".auth-panel");
const signupFeedback = document.getElementById("signup-feedback");
const loginFeedback = document.getElementById("login-feedback");

const profileForm = document.getElementById("profile-form");
const profileResult = document.getElementById("profile-result");
const profileDisplayName = document.getElementById("profile-display-name");
const profileLocation = document.getElementById("profile-location");
const profileClimateFocus = document.getElementById("profile-climate-focus");
const profileBio = document.getElementById("profile-bio");
const profileSaveButton = document.getElementById("profile-save-button");
const profileSaveMeta = document.getElementById("profile-save-meta");

const footprintForm = document.getElementById("footprint-form");
const footprintResult = document.getElementById("footprint-result");
const footprintHistory = document.getElementById("footprint-history");

const quizForm = document.getElementById("quiz-form");
const quizResult = document.getElementById("quiz-result");
const quizHistory = document.getElementById("quiz-history");

const checklist = document.getElementById("checklist");
const activityList = document.getElementById("activity-list");

const answers = { q1: "b", q2: "a", q3: "a" };
const localChecklistStorageKey = "climate-compass-actions";

let currentUser = null;
let isProfileDirty = false;

const topicContent = {
  weather: {
    title: "Weather Extremes",
    summary:
      "Warmer air holds more moisture and heat, increasing intense rainfall in some regions while making heatwaves and droughts more likely in others.",
    detail:
      "Climate change does not cause every weather event, but it can increase severity and frequency, which raises adaptation needs for homes, cities, and infrastructure.",
  },
  oceans: {
    title: "Oceans and Sea Level",
    summary:
      "Oceans absorb excess heat and carbon dioxide, leading to warmer waters, coral stress, and acidification.",
    detail:
      "As water warms, it expands. Melting land ice adds volume too. Together these trends raise sea levels and increase flood risks for coastal communities.",
  },
  food: {
    title: "Food and Water Security",
    summary:
      "Shifting rainfall patterns and extreme heat can lower crop yields and strain freshwater availability.",
    detail:
      "Farmers adapt with crop selection, soil conservation, and irrigation strategies, but repeated climate shocks still challenge food systems globally.",
  },
  health: {
    title: "Human Health",
    summary:
      "Higher temperatures increase heat-related illnesses and can worsen air quality, especially during wildfire seasons.",
    detail:
      "Climate impacts are uneven. Communities with lower income or weaker health infrastructure are often more exposed and less able to recover quickly.",
  },
};

function formatDate(value) {
  return new Date(value).toLocaleString();
}

function safeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function renderTopic(topicKey) {
  const topic = topicContent[topicKey];
  topicPanel.innerHTML = `
    <h4>${topic.title}</h4>
    <p>${topic.summary}</p>
    <p>${topic.detail}</p>
  `;
}

function setAuthStatus(message) {
  authStatus.textContent = message;
}

function setInlineMessage(element, message, type = "neutral") {
  element.textContent = message;
  element.classList.remove("error", "success");
  if (type === "error" || type === "success") {
    element.classList.add(type);
  }
}

function clearAuthFormMessages() {
  setInlineMessage(signupFeedback, "");
  setInlineMessage(loginFeedback, "");
}

function setProfileMeta(message) {
  profileSaveMeta.textContent = message;
}

function switchAuthMode(mode) {
  authTabs.forEach((tab) => {
    const isActive = tab.dataset.authMode === mode;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });

  authPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.authPanel === mode);
  });
}

function setProfileMessage(message) {
  profileResult.textContent = message;
}

function renderEmptyState(container, message) {
  container.innerHTML = `<li class="history-item"><span>${message}</span></li>`;
}

function updateAuthControls() {
  const isLoggedIn = Boolean(currentUser);
  logoutButton.hidden = !isLoggedIn;
  sessionChip.textContent = isLoggedIn ? `Signed in as ${currentUser.email}` : "Guest mode";

  profileForm.querySelectorAll("input, textarea, button").forEach((element) => {
    element.disabled = !isLoggedIn;
  });

  authTabs.forEach((tab) => {
    tab.disabled = isLoggedIn;
  });

  signupForm.querySelectorAll("input, button").forEach((element) => {
    element.disabled = isLoggedIn;
  });

  loginForm.querySelectorAll("input, button").forEach((element) => {
    element.disabled = isLoggedIn;
  });

  if (isLoggedIn) {
    clearAuthFormMessages();
  }
}

function loadLocalChecklist() {
  const saved = JSON.parse(localStorage.getItem(localChecklistStorageKey) || "[]");
  checklist.querySelectorAll("input[type='checkbox']").forEach((checkbox) => {
    checkbox.checked = saved.includes(checkbox.dataset.id);
  });
}

function saveLocalChecklist() {
  const checkedIds = Array.from(
    checklist.querySelectorAll("input[type='checkbox']:checked")
  ).map((checkbox) => checkbox.dataset.id);
  localStorage.setItem(localChecklistStorageKey, JSON.stringify(checkedIds));
}

function clearUserViewData() {
  profileForm.reset();
  isProfileDirty = false;
  setProfileMessage("Log in to load and edit your profile.");
  setProfileMeta('Profile changes are not synced until you click "Save profile".');
  renderEmptyState(footprintHistory, "Login to save and view footprint history.");
  renderEmptyState(quizHistory, "Login to save and view quiz history.");
  renderEmptyState(activityList, "Login to view your activity timeline.");
  loadLocalChecklist();
}

async function logActivity(eventType, eventPayload = {}) {
  if (!currentUser || !supabase) return;

  const { error } = await supabase.from("user_activity_events").insert({
    user_id: currentUser.id,
    event_type: eventType,
    event_payload: eventPayload,
  });

  if (error) {
    console.error("Could not save activity event:", error.message);
  }
}

async function ensureUserProfile(user) {
  if (!supabase || !user) return;

  const { error } = await supabase.from("user_profiles").upsert(
    {
      id: user.id,
      email: user.email,
      display_name: user.user_metadata?.display_name || "",
      last_active_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) {
    console.error("Could not create user profile:", error.message);
  }
}

async function loadProfile() {
  if (!currentUser || !supabase) return;

  const { data, error } = await supabase
    .from("user_profiles")
    .select("display_name, location, climate_focus, bio, total_events, last_active_at")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (error) {
    setProfileMessage(`Unable to load profile: ${error.message}`);
    return;
  }

  profileDisplayName.value = data?.display_name || "";
  profileLocation.value = data?.location || "";
  profileClimateFocus.value = data?.climate_focus || "";
  profileBio.value = data?.bio || "";
  isProfileDirty = false;

  if (data?.last_active_at) {
    setProfileMessage(
      `Profile loaded. Total interactions: ${data.total_events}. Last active: ${formatDate(
        data.last_active_at
      )}`
    );
    setProfileMeta(`Profile synced at ${formatDate(data.last_active_at)}.`);
    return;
  }

  setProfileMessage("Profile loaded.");
  setProfileMeta('Profile changes are not synced until you click "Save profile".');
}

function markProfileAsDirty() {
  if (!currentUser) return;
  if (isProfileDirty) return;

  isProfileDirty = true;
  setProfileMeta("You have unsaved profile changes.");
}

async function saveProfile(event) {
  event.preventDefault();

  if (!currentUser || !supabase) {
    setProfileMessage("Please login before saving profile updates.");
    return;
  }

  profileSaveButton.disabled = true;
  profileSaveButton.textContent = "Saving...";

  const payload = {
    id: currentUser.id,
    email: currentUser.email,
    display_name: profileDisplayName.value.trim(),
    location: profileLocation.value.trim(),
    climate_focus: profileClimateFocus.value.trim(),
    bio: profileBio.value.trim(),
    last_active_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("user_profiles")
    .upsert(payload, { onConflict: "id" });

  if (error) {
    setProfileMessage(`Failed to save profile: ${error.message}`);
    setProfileMeta("Save failed. Review your profile details and try again.");
    profileSaveButton.disabled = false;
    profileSaveButton.textContent = "Save profile";
    return;
  }

  setProfileMessage("Profile saved successfully.");
  setProfileMeta(`Profile synced at ${formatDate(new Date().toISOString())}.`);
  isProfileDirty = false;
  await logActivity("profile_updated", {
    location: payload.location,
    climate_focus: payload.climate_focus,
  });
  await Promise.all([loadActivity(), loadProfile()]);
  profileSaveButton.disabled = false;
  profileSaveButton.textContent = "Save profile";
}

function renderHistoryList(container, records, formatter) {
  if (!records.length) {
    renderEmptyState(container, "No records yet.");
    return;
  }

  container.innerHTML = records
    .map((record) => formatter(record))
    .join("");
}

async function loadFootprintHistory() {
  if (!currentUser || !supabase) {
    renderEmptyState(footprintHistory, "Login to save and view footprint history.");
    return;
  }

  const { data, error } = await supabase
    .from("user_footprints")
    .select("id, car_km, meat_meals, home_kwh, estimated_tco2e, created_at")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    renderEmptyState(footprintHistory, `Could not load records: ${error.message}`);
    return;
  }

  renderHistoryList(footprintHistory, data || [], (record) => {
    return `<li class="history-item">
      <span>
        <strong>${record.estimated_tco2e} tCO2e/yr</strong>
        <small>Car: ${record.car_km} km/wk, Meat: ${record.meat_meals}/wk, Power: ${record.home_kwh} kWh/mo</small>
        <small>${formatDate(record.created_at)}</small>
      </span>
      <button type="button" class="danger-button" data-footprint-id="${record.id}">
        Delete
      </button>
    </li>`;
  });
}

async function deleteFootprint(recordId) {
  if (!currentUser || !supabase) return;

  const { error } = await supabase
    .from("user_footprints")
    .delete()
    .eq("id", recordId)
    .eq("user_id", currentUser.id);

  if (error) {
    footprintResult.textContent = `Delete failed: ${error.message}`;
    return;
  }

  footprintResult.textContent = "Footprint entry deleted.";
  await logActivity("footprint_deleted", { footprint_id: recordId });
  await Promise.all([loadFootprintHistory(), loadActivity(), loadProfile()]);
}

async function handleFootprintSubmit(event) {
  event.preventDefault();

  const carKm = safeNumber(document.getElementById("car-km").value);
  const meatMeals = safeNumber(document.getElementById("meat-meals").value);
  const homeKwh = safeNumber(document.getElementById("home-kwh").value);

  const carKgPerYear = carKm * 52 * 0.17;
  const meatKgPerYear = meatMeals * 52 * 2;
  const homeKgPerYear = homeKwh * 12 * 0.4;

  const totalKg = carKgPerYear + meatKgPerYear + homeKgPerYear;
  const totalTons = totalKg / 1000;
  const roundedTons = Number(totalTons.toFixed(2));

  footprintResult.textContent = `Estimated annual footprint from these choices: ${roundedTons} tCO2e/year.`;

  if (!currentUser || !supabase) {
    footprintResult.textContent += " Login to save this estimate in your profile.";
    return;
  }

  const { error } = await supabase.from("user_footprints").insert({
    user_id: currentUser.id,
    car_km: carKm,
    meat_meals: meatMeals,
    home_kwh: homeKwh,
    estimated_tco2e: roundedTons,
  });

  if (error) {
    footprintResult.textContent = `Could not save estimate: ${error.message}`;
    return;
  }

  await logActivity("footprint_calculated", { estimated_tco2e: roundedTons });
  await Promise.all([loadFootprintHistory(), loadActivity(), loadProfile()]);
}

async function loadQuizHistory() {
  if (!currentUser || !supabase) {
    renderEmptyState(quizHistory, "Login to save and view quiz history.");
    return;
  }

  const { data, error } = await supabase
    .from("user_quiz_attempts")
    .select("id, score, created_at")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    renderEmptyState(quizHistory, `Could not load records: ${error.message}`);
    return;
  }

  renderHistoryList(quizHistory, data || [], (record) => {
    return `<li class="history-item">
      <span>
        <strong>Score: ${record.score}/3</strong>
        <small>${formatDate(record.created_at)}</small>
      </span>
    </li>`;
  });
}

async function handleQuizSubmit(event) {
  event.preventDefault();

  const formData = new FormData(quizForm);
  const selectedAnswers = {
    q1: formData.get("q1"),
    q2: formData.get("q2"),
    q3: formData.get("q3"),
  };

  const unanswered = Object.values(selectedAnswers).filter((value) => !value).length;
  if (unanswered > 0) {
    quizResult.textContent = `Please answer all questions. You still have ${unanswered} unanswered.`;
    return;
  }

  let score = 0;
  Object.keys(answers).forEach((key) => {
    if (selectedAnswers[key] === answers[key]) score += 1;
  });

  quizResult.textContent =
    score === 3
      ? "Great job! You got 3/3. You understand the basics well."
      : `You scored ${score}/3. Review the sections above and try again.`;

  if (!currentUser || !supabase) {
    quizResult.textContent += " Login to store your quiz history.";
    return;
  }

  const { error } = await supabase.from("user_quiz_attempts").insert({
    user_id: currentUser.id,
    score,
    answers: selectedAnswers,
  });

  if (error) {
    quizResult.textContent = `Could not save quiz attempt: ${error.message}`;
    return;
  }

  await logActivity("quiz_completed", { score });
  await Promise.all([loadQuizHistory(), loadActivity(), loadProfile()]);
}

async function loadChecklistForUser() {
  if (!currentUser || !supabase) {
    loadLocalChecklist();
    return;
  }

  const { data, error } = await supabase
    .from("user_actions")
    .select("action_id, is_selected")
    .eq("user_id", currentUser.id);

  if (error) {
    console.error("Could not load checklist state:", error.message);
    return;
  }

  if (!data || data.length === 0) {
    loadLocalChecklist();
    return;
  }

  const selected = new Set(data.filter((row) => row.is_selected).map((row) => row.action_id));
  checklist.querySelectorAll("input[type='checkbox']").forEach((checkbox) => {
    checkbox.checked = selected.has(checkbox.dataset.id);
  });
}

async function handleChecklistChange(event) {
  if (!(event.target instanceof HTMLInputElement) || event.target.type !== "checkbox") {
    return;
  }

  saveLocalChecklist();

  if (!currentUser || !supabase) return;

  const payload = {
    user_id: currentUser.id,
    action_id: event.target.dataset.id,
    is_selected: event.target.checked,
  };

  const { error } = await supabase
    .from("user_actions")
    .upsert(payload, { onConflict: "user_id,action_id" });

  if (error) {
    console.error("Could not save checklist item:", error.message);
    return;
  }

  await logActivity("action_updated", payload);
  await Promise.all([loadActivity(), loadProfile()]);
}

function describeActivity(record) {
  const payload = record.event_payload || {};

  switch (record.event_type) {
    case "profile_updated":
      return "Updated profile details";
    case "topic_viewed":
      return `Viewed impact topic: ${payload.topic || "unknown"}`;
    case "footprint_calculated":
      return `Calculated footprint: ${payload.estimated_tco2e || "?"} tCO2e`;
    case "footprint_deleted":
      return "Deleted a footprint entry";
    case "quiz_completed":
      return `Completed quiz with score ${payload.score || 0}/3`;
    case "action_updated":
      return `${payload.is_selected ? "Selected" : "Unselected"} action: ${payload.action_id}`;
    default:
      return record.event_type;
  }
}

async function loadActivity() {
  if (!currentUser || !supabase) {
    renderEmptyState(activityList, "Login to view your activity timeline.");
    return;
  }

  const { data, error } = await supabase
    .from("user_activity_events")
    .select("event_type, event_payload, created_at")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) {
    renderEmptyState(activityList, `Could not load timeline: ${error.message}`);
    return;
  }

  renderHistoryList(activityList, data || [], (record) => {
    return `<li class="history-item">
      <span>
        <strong>${describeActivity(record)}</strong>
        <small>${formatDate(record.created_at)}</small>
      </span>
    </li>`;
  });
}

async function recordTopicView(topic) {
  if (!currentUser || !supabase) return;

  const { error } = await supabase.from("user_topic_views").insert({
    user_id: currentUser.id,
    topic,
  });

  if (error) {
    console.error("Could not save topic view:", error.message);
    return;
  }

  await logActivity("topic_viewed", { topic });
  await Promise.all([loadActivity(), loadProfile()]);
}

async function initializeSession(user) {
  currentUser = user;
  updateAuthControls();
  switchAuthMode("login");

  await ensureUserProfile(user);
  setAuthStatus(`Logged in as ${user.email}`);

  await Promise.all([
    loadProfile(),
    loadFootprintHistory(),
    loadQuizHistory(),
    loadChecklistForUser(),
    loadActivity(),
  ]);
}

async function signup(event) {
  event.preventDefault();
  if (!supabase) {
    setAuthStatus("Supabase credentials are missing. Add them in .env.local.");
    return;
  }

  clearAuthFormMessages();
  setInlineMessage(signupFeedback, "Creating account...");

  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;
  const displayName = document.getElementById("signup-name").value.trim();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
      },
    },
  });

  if (error) {
    setInlineMessage(signupFeedback, error.message, "error");
    setAuthStatus(`Sign-up failed: ${error.message}`);
    return;
  }

  if (data.session?.user) {
    setInlineMessage(signupFeedback, "Account created and signed in.", "success");
    await initializeSession(data.session.user);
    setAuthStatus(`Welcome, ${data.session.user.email}. Your profile can now be saved.`);
  } else if (data.user) {
    setInlineMessage(
      signupFeedback,
      "Account created. Check your email and then log in.",
      "success"
    );
    document.getElementById("login-email").value = email;
    switchAuthMode("login");
    setAuthStatus(
      "Sign-up successful. If email confirmation is enabled, confirm your email before logging in."
    );
  }

  signupForm.reset();
}

async function login(event) {
  event.preventDefault();
  if (!supabase) {
    setAuthStatus("Supabase credentials are missing. Add them in .env.local.");
    return;
  }

  clearAuthFormMessages();
  setInlineMessage(loginFeedback, "Logging you in...");

  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    setInlineMessage(loginFeedback, error.message, "error");
    setAuthStatus(`Login failed: ${error.message}`);
    return;
  }

  setInlineMessage(loginFeedback, "Login successful.", "success");
  setAuthStatus(`Login successful for ${email}`);
  loginForm.reset();
}

async function logout() {
  if (!supabase) return;
  setAuthStatus("Signing out...");
  const { error } = await supabase.auth.signOut();
  if (error) {
    setAuthStatus(`Sign out failed: ${error.message}`);
    return;
  }

  clearAuthFormMessages();
}

function wireTopicTabs() {
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((item) => {
        item.classList.remove("active");
        item.setAttribute("aria-selected", "false");
      });

      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");
      renderTopic(tab.dataset.topic);
      void recordTopicView(tab.dataset.topic);
    });
  });
}

function disableAuthAndDataFeatures() {
  authTabs.forEach((tab) => {
    tab.disabled = true;
  });
  signupForm.querySelectorAll("input, button").forEach((el) => {
    el.disabled = true;
  });
  loginForm.querySelectorAll("input, button").forEach((el) => {
    el.disabled = true;
  });
  profileForm.querySelectorAll("input, textarea, button").forEach((el) => {
    el.disabled = true;
  });
  sessionChip.textContent = "Supabase unavailable";
  setAuthStatus(
    "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local."
  );
}

function setupEventListeners() {
  authTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      if (tab.disabled) return;
      switchAuthMode(tab.dataset.authMode);
      clearAuthFormMessages();
    });
  });

  signupForm.addEventListener("submit", signup);
  loginForm.addEventListener("submit", login);
  logoutButton.addEventListener("click", logout);

  profileForm.addEventListener("submit", saveProfile);
  profileForm.querySelectorAll("input, textarea").forEach((element) => {
    element.addEventListener("input", markProfileAsDirty);
  });
  footprintForm.addEventListener("submit", handleFootprintSubmit);
  quizForm.addEventListener("submit", handleQuizSubmit);
  checklist.addEventListener("change", handleChecklistChange);
  footprintHistory.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;
    const footprintId = target.dataset.footprintId;
    if (!footprintId) return;
    void deleteFootprint(footprintId);
  });
}

async function init() {
  setupEventListeners();
  wireTopicTabs();
  switchAuthMode("login");
  renderTopic("weather");
  loadLocalChecklist();
  clearUserViewData();

  if (!hasSupabaseCredentials || !supabase) {
    disableAuthAndDataFeatures();
    return;
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    setAuthStatus(`Could not read auth session: ${error.message}`);
  }

  if (data.session?.user) {
    await initializeSession(data.session.user);
  } else {
    setAuthStatus("Not logged in. Create an account or login to sync your data.");
  }

  supabase.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
      void initializeSession(session.user);
      if (event === "SIGNED_IN") {
        setAuthStatus(`Welcome back, ${session.user.email}.`);
      }
      return;
    }

    currentUser = null;
    updateAuthControls();
    setAuthStatus("Logged out. Local app mode remains available.");
    if (event === "SIGNED_OUT") {
      setInlineMessage(loginFeedback, "You have signed out.", "success");
    }
    clearUserViewData();
  });
}

init();
