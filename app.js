const topicPanel = document.getElementById("topic-panel");
const tabs = document.querySelectorAll(".tab");
const footprintForm = document.getElementById("footprint-form");
const footprintResult = document.getElementById("footprint-result");
const quizForm = document.getElementById("quiz-form");
const quizResult = document.getElementById("quiz-result");
const checklist = document.getElementById("checklist");

const topicContent = {
  weather: {
    title: "Weather Extremes",
    summary:
      "Warmer air holds more moisture and heat, increasing the likelihood of intense rainfall in some regions and prolonged heatwaves and drought in others.",
    detail:
      "Climate change does not create every weather event, but it can amplify their severity and frequency, making planning and adaptation more urgent.",
  },
  oceans: {
    title: "Oceans and Sea Level",
    summary:
      "Oceans absorb excess heat and carbon dioxide, leading to warmer waters, coral stress, and acidification.",
    detail:
      "As water warms it expands, and melting land ice adds more volume, which contributes to sea-level rise and raises flood risk in coastal areas.",
  },
  food: {
    title: "Food and Water Security",
    summary:
      "Changing rainfall patterns and extreme heat can reduce crop yields and strain freshwater supplies.",
    detail:
      "Farmers adapt through crop selection, irrigation strategies, and soil conservation, but repeated climate shocks still challenge food systems globally.",
  },
  health: {
    title: "Human Health",
    summary:
      "Higher temperatures increase heat-related illness and can worsen air quality, especially during wildfire seasons.",
    detail:
      "Climate impacts are not equal: lower-income communities and areas with weaker health infrastructure are often most exposed to risk.",
  },
};

function renderTopic(topicKey) {
  const topic = topicContent[topicKey];
  topicPanel.innerHTML = `
    <h4>${topic.title}</h4>
    <p>${topic.summary}</p>
    <p>${topic.detail}</p>
  `;
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((item) => {
      item.classList.remove("active");
      item.setAttribute("aria-selected", "false");
    });
    tab.classList.add("active");
    tab.setAttribute("aria-selected", "true");
    renderTopic(tab.dataset.topic);
  });
});

footprintForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const carKm = Number(document.getElementById("car-km").value);
  const meatMeals = Number(document.getElementById("meat-meals").value);
  const homeKwh = Number(document.getElementById("home-kwh").value);

  // Lightweight educational factors to illustrate relative impact.
  const carKgPerYear = carKm * 52 * 0.17;
  const meatKgPerYear = meatMeals * 52 * 2.0;
  const homeKgPerYear = homeKwh * 12 * 0.4;

  const totalKg = carKgPerYear + meatKgPerYear + homeKgPerYear;
  const totalTons = totalKg / 1000;

  footprintResult.textContent = `Estimated annual footprint from these choices: ${totalTons.toFixed(
    2
  )} tCO2e/year. Small changes across travel, food, and energy can reduce this over time.`;
});

quizForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const answers = { q1: "b", q2: "a", q3: "a" };
  let score = 0;
  let missing = 0;

  Object.keys(answers).forEach((key) => {
    const value = new FormData(quizForm).get(key);
    if (!value) {
      missing += 1;
      return;
    }
    if (value === answers[key]) score += 1;
  });

  if (missing > 0) {
    quizResult.textContent = `Please answer all questions. You still have ${missing} unanswered.`;
    return;
  }

  if (score === 3) {
    quizResult.textContent =
      "Great job! You got 3/3. You understand the basics well.";
  } else {
    quizResult.textContent = `You scored ${score}/3. Review the sections above and try again.`;
  }
});

const storageKey = "climate-compass-actions";

function loadChecklist() {
  const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
  checklist.querySelectorAll("input[type='checkbox']").forEach((checkbox) => {
    checkbox.checked = saved.includes(checkbox.dataset.id);
  });
}

function saveChecklist() {
  const checkedIds = Array.from(
    checklist.querySelectorAll("input[type='checkbox']:checked")
  ).map((checkbox) => checkbox.dataset.id);
  localStorage.setItem(storageKey, JSON.stringify(checkedIds));
}

checklist.addEventListener("change", saveChecklist);

renderTopic("weather");
loadChecklist();
