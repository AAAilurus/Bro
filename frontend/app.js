/******** helpers ********/
const $  = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const save = (k,v) => localStorage.setItem(k, JSON.stringify(v));
const load = (k,d=null) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } };

// simple SHA-256 (with fallback) for local-only demo auth
async function sha(s){
  try{
    if (crypto?.subtle){
      const enc = new TextEncoder();
      const b = await crypto.subtle.digest('SHA-256', enc.encode(s));
      return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join('');
    }
  }catch{}
  // insecure fallback so file:// works
  let h = 5381; for (let i=0;i<s.length;i++) h=((h<<5)+h)+s.charCodeAt(i);
  return (h>>>0).toString(16);
}

/******** state & keys ********/
let currentUser = null; // {email,name}
const KEYS = {
  USERS: "bro.users",         // [{email, name, passHash, profile:{uni,city,diet}}]
  CURR:  "bro.current",       // email
  PROFILE: (email)=>`bro.${email}.profile`,
  NOTES:   (email,sec)=>`bro.${email}.notes.${sec}`,
};

/******** auth (local) ********/
async function signUpLocal({name,email,pass,uni,city,diet}){
  const users = load(KEYS.USERS, []);
  if (users.some(u=>u.email===email)) throw new Error("Email exists. Log in instead.");
  const passHash = await sha(pass);
  users.push({ email, name, passHash, profile:{ uni:uni||"", city:city||"", diet:diet||"any" } });
  save(KEYS.USERS, users);
  save(KEYS.CURR, email);
  currentUser = { email, name };
}
async function loginLocal({email,pass}){
  const users = load(KEYS.USERS, []);
  const u = users.find(x=>x.email===email);
  if (!u) throw new Error("No account with that email");
  const ok = (await sha(pass))===u.passHash;
  if (!ok) throw new Error("Wrong password");
  save(KEYS.CURR, email);
  currentUser = { email, name: u.name };
}
function logout(){
  localStorage.removeItem(KEYS.CURR);
  currentUser = null;
  location.hash = "#home";
  render();
}

/******** notes ********/
function notesBox(sec){
  const email = currentUser?.email || "guest";
  const key = KEYS.NOTES(email, sec);
  const val = load(key, "") || "";
  return `
  <div class="card">
    <h3>Your Notes</h3>
    <textarea id="note_${sec}">${val}</textarea>
    <div style="margin-top:8px">
      <button class="ghost" onclick="(function(){
        const v = document.getElementById('note_${sec}').value;
        localStorage.setItem('${key}', JSON.stringify(v));
        alert('Saved');
      })()">Save notes</button>
    </div>
  </div>`;
}

/******** content helpers ********/
const commonMapsTip = `
  <p class="mini">Tip: In <b>Google Maps</b>, type queries like
  <b>“[place type] near [your address/university]”</b> (e.g., “bank near 123 Main St”).
  Open result → check hours, reviews, busy times, and save favorites.</p>`;

const commonMoreInfo = `
  <p class="mini">See the main websites for more info (official sites, directories, help pages). Add your own links in the notes.</p>`;

/******** per-section content ********/
function homeHTML(){
  return `
  <div class="card">
    <h1>Welcome to BRO</h1>
    <p><b>BRO</b> is your beginner-friendly buddy for the first weeks living abroad,
    built for students (17–23) who are learning to handle life admin on their own.</p>
    <h3>What we provide</h3>
    <ul>
      <li><b>Step guides</b> for SSN, Banking, Insurance, DMV/IDs, Health care, Furniture, Communities, License/Permits, Temples, Food, Fun, Drives, Lakes.</li>
      <li><b>Your notes</b> area on every page (saved locally to your browser).</li>
      <li><b>Clear navigation</b>: sidebar for topics; page body for what/why/docs/steps/links.</li>
      <li><b>Private by default</b>: this version stores everything locally.</li>
    </ul>
    <p>Open any section on the left, follow the steps, and use the notes box to keep your personal links (appointments, campus pages, state rules).</p>
    ${commonMapsTip}
    ${commonMoreInfo}
  </div>`;
}

function ssnHTML(){
  return `
  <div class="card">
    <h1>SSN (Social Security Number)</h1>
    <h3>What it is</h3>
    <p>A unique number from the Social Security Administration (SSA) used for taxes and employment.</p>
    <h3>Why you need it</h3>
    <p>Required for paid work and helpful for building credit. Not needed just to study.</p>
    <h3>Docs you’ll usually bring</h3>
    <ul>
      <li>Passport</li><li>I-20/DS-2019</li><li>I-94 record</li>
      <li>Job offer/on-campus employment letter (F-1)</li>
      <li>SS-5 form</li><li>Proof of U.S. address</li>
    </ul>
    <h3>How to apply</h3>
    <ol>
      <li>Confirm eligibility (on-campus job / CPT).</li>
      <li>Fill SS-5 and gather docs.</li>
      <li>Search “SSA office near [your address]” in Google Maps; confirm hours and bring originals.</li>
      <li>Card arrives by mail (typically 1–3 weeks). Keep it private.</li>
    </ol>
    <h3>Official links</h3>
    <ul>
      <li><a target="_blank" href="https://www.ssa.gov/ssnumber/">SSA – SSN & SS-5</a></li>
      <li><a target="_blank" href="https://i94.cbp.dhs.gov/">I-94 travel record</a></li>
    </ul>
    ${commonMapsTip}
    ${commonMoreInfo}
  </div>`;
}

function bankingHTML(){
  return `
  <div class="card">
    <h1>Banking (Debit & Credit)</h1>
    <h2>Debit (Checking)</h2>
    <p><b>Why:</b> daily spending, ATM, rent, bills.</p>
    <h3>Docs</h3>
    <ul><li>Passport</li><li>I-20/DS-2019</li><li>Proof of address</li></ul>
    <h3>Steps</h3>
    <ol>
      <li>Pick a student-friendly bank (low/no monthly fees, wide ATMs, Zelle).</li>
      <li>Open a checking account → get a debit card.</li>
      <li>Enable mobile banking, alerts, and 2-factor.</li>
    </ol>
    <h2>Credit (Build history carefully)</h2>
    <ul><li>Start with student/secured card</li><li>Utilization &lt; 30% (ideally ~10%)</li><li>Autopay in full</li></ul>
    <h3>How to search</h3>
    <p>Google Maps: “bank near [your address/university]”, “ATM near [your address]”. Check hours, reviews, access.</p>
    <h3>Helpful</h3>
    <ul>
      <li><a target="_blank" href="https://www.consumerfinance.gov/">ConsumerFinance.gov</a></li>
      <li><a target="_blank" href="https://banks.data.fdic.gov/bankfind-suite/">FDIC BankFind</a></li>
    </ul>
    ${commonMapsTip}
    ${commonMoreInfo}
  </div>`;
}

function insuranceHTML(){
  return `
  <div class="card">
    <h1>Insurance (Health & Car)</h1>
    <h2>Health Insurance</h2>
    <p><b>Why:</b> medical care is expensive; most universities require coverage or a waiver.</p>
    <h3>How to search & compare</h3>
    <ul>
      <li>Google: “[your university] student health insurance waiver”.</li>
      <li>Google Maps: “urgent care / primary care / pharmacy near [your address]”.</li>
      <li>On insurer sites, open the <b>Summary of Benefits and Coverage (SBC)</b> to see deductible, copay, in-network, ER vs urgent care.</li>
    </ul>
    <h3>What’s covered?</h3>
    <p>Look for: primary care, specialists, urgent care, ER, prescriptions, mental health, immunizations, telehealth, and any referral rules.</p>
    <h2>Car Insurance</h2>
    <p><b>Why:</b> legally required if you own/drive a car.</p>
    <ul>
      <li>Google: “car insurance [your state] quotes”, “car insurance near [your address]”.</li>
      <li>Compare: liability vs full coverage, deductibles, roadside, rental coverage, student discounts.</li>
    </ul>
    <h3>Helpful</h3>
    <ul>
      <li><a target="_blank" href="https://www.healthcare.gov/">HealthCare.gov</a></li>
      <li><a target="_blank" href="https://content.naic.org/consumer.htm">NAIC Consumer</a></li>
      <li><a target="_blank" href="https://www.cdc.gov/">CDC</a></li>
    </ul>
    ${commonMapsTip}
    ${commonMoreInfo}
  </div>`;
}

function gocHTML(){
  return `
  <div class="card">
    <h1>Govt Offices & Cards (GOC)</h1>
    <h3>What this covers</h3>
    <p>State ID / driver’s permit at DMV/DPS; campus student ID.</p>
    <h3>Docs</h3>
    <ul><li>Passport</li><li>I-94</li><li>I-20/DS-2019</li><li>Proof of residence</li><li>Enrollment letter</li><li>SSN (if available)</li></ul>
    <h3>Steps</h3>
    <ol>
      <li>Google Maps: “DMV near [your address]”.</li>
      <li>Check if your state requires appointment; book online.</li>
      <li>Bring originals + copies; arrive early.</li>
    </ol>
    <h3>Official</h3>
    <ul><li><a target="_blank" href="https://www.usa.gov/motor-vehicle-services">USA.gov – DMV</a></li></ul>
    ${commonMapsTip}
    ${commonMoreInfo}
  </div>`;
}

function healthHTML(){
  return `
  <div class="card">
    <h1>Health Care</h1>
    <p><b>Emergencies</b> → call 911. <b>Urgent</b> (not life-threatening) → urgent care. <b>Routine</b> → primary care/student health. <b>Meds</b> → pharmacies.</p>
    <h3>How to find places</h3>
    <ul>
      <li>Google Maps: “hospital / urgent care / pharmacy / immunization clinic near [your address]”.</li>
      <li>Add your insurer name to find in-network providers.</li>
    </ul>
    <h3>Getting medicines</h3>
    <p>Take your prescription to a pharmacy; ask about generics & savings programs.</p>
    <h3>What’s covered (tie-in with Health Insurance)</h3>
    <p>Log in to your insurer portal → Benefits → read the <b>SBC</b> for coverage/limits.</p>
    <h3>Helpful</h3>
    <ul><li><a target="_blank" href="https://www.cdc.gov/">CDC</a></li></ul>
    ${commonMapsTip}
    ${commonMoreInfo}
  </div>`;
}

function furnHTML(){
  return `
  <div class="card">
    <h1>Furniture & Buying Sites</h1>
    <h3>How to find stores</h3>
    <p>Google Maps: “furniture store / thrift store / mattress near [your address]”. Check delivery, assembly, returns, open-box deals.</p>
    <h3>Starter kit</h3>
    <ul><li>Mattress + linens</li><li>Desk/chair/lamp</li><li>Hangers, laundry basket</li><li>Basic cookware</li></ul>
    <h3>Online</h3>
    <ul><li>Amazon</li><li>IKEA</li><li>Walmart</li><li>Target</li><li>Wayfair</li><li>Craigslist</li><li>Facebook Marketplace</li><li>OfferUp</li></ul>
    ${commonMapsTip}
    ${commonMoreInfo}
  </div>`;
}

function commHTML(){
  return `
  <div class="card">
    <h1>FB Communities</h1>
    <h3>What to search</h3>
    <ul>
      <li>FB Groups: “[Your University] international students / housing / buy sell”.</li>
      <li>Google: <code>site:facebook.com/groups [city] students</code>, <code>site:facebook.com/groups [university]</code></li>
    </ul>
    <h3>Safety</h3>
    <ul><li>Meet in public</li><li>Don’t share SSN/ID</li><li>Use trusted payments</li></ul>
    <h3>Helpful</h3>
    <ul><li><a target="_blank" href="https://www.facebook.com/help/">Facebook Help</a></li></ul>
    ${commonMapsTip}
    ${commonMoreInfo}
  </div>`;
}

function licHTML(){
  return `
  <div class="card">
    <h1>License / Permits (Driving)</h1>
    <h3>Why you need it</h3><p>Legal driving, identity proof, often better insurance rates later.</p>
    <h3>Steps</h3>
    <ol>
      <li><b>Learner Permit</b>: study state handbook → knowledge test + vision.</li>
      <li><b>Practice</b>: follow state rules (supervised hours, etc.).</li>
      <li><b>Road Test</b>: schedule online; bring car/insurance/permit.</li>
      <li>Get your <b>License</b> if you pass.</li>
    </ol>
    <h3>Docs</h3>
    <ul><li>Passport</li><li>I-94</li><li>I-20/DS-2019</li><li>Proof of residence</li><li>SSN (or eligibility letter if allowed)</li><li>Enrollment letter</li></ul>
    <h3>Appointments</h3>
    <p>Google Maps: “DMV near [your address]” → open your state DMV site → book appointment.</p>
    <h3>Official</h3>
    <ul><li><a target="_blank" href="https://www.usa.gov/motor-vehicle-services">USA.gov – DMV</a></li></ul>
    ${commonMapsTip}
    ${commonMoreInfo}
  </div>`;
}

function templesHTML(){
  return `
  <div class="card">
    <h1>Temples / Faith</h1>
    <p>Use Google Maps: “Hindu temple / mosque / church / gurdwara near [your address]”. Check service times, events, parking, and any guidelines. Start with your state (e.g., Texas) and build your own list.</p>
    <p class="mini">There are hundreds across the U.S.—add the ones you find to your notes below.</p>
    ${commonMapsTip}
    ${commonMoreInfo}
  </div>`;
}

function foodHTML(){
  return `
  <div class="card">
    <h1>Food & Restaurants</h1>
    <h3>Groceries</h3>
    <p>Google Maps: “grocery near [your address]”, “Indian/Asian/Halal grocery near [your address]”.</p>
    <h3>Eating out</h3>
    <p>Use filters for vegetarian/vegan/halal, price, open now, delivery (Google Maps / Yelp).</p>
    <h3>Budget tip</h3>
    <p>Install store apps (Target/Walmart/Kroger/HEB) for digital coupons.</p>
    <h3>Helpful</h3>
    <ul><li><a target="_blank" href="https://www.yelp.com/">Yelp</a></li></ul>
    ${commonMapsTip}
    ${commonMoreInfo}
  </div>`;
}

function funHTML(){
  return `
  <div class="card">
    <h1>Fun Activities</h1>
    <h3>Find ideas fast</h3>
    <ul>
      <li>Google: “events this weekend [your city]”, “free things to do [your city]”.</li>
      <li>Sites: Eventbrite, Meetup, university events calendar, parks & recreation.</li>
    </ul>
    <h3>Starters</h3>
    <ul><li>Campus clubs</li><li>Parks/trails</li><li>Museums (free days)</li><li>Game nights</li></ul>
    <h3>Helpful</h3>
    <ul>
      <li><a target="_blank" href="https://www.eventbrite.com/">Eventbrite</a></li>
      <li><a target="_blank" href="https://www.meetup.com/">Meetup</a></li>
    </ul>
    ${commonMapsTip}
    ${commonMoreInfo}
  </div>`;
}

function driveHTML(){
  return `
  <div class="card">
    <h1>Scenic Drives</h1>
    <h3>Plan</h3>
    <ul>
      <li>Google Maps: “scenic drive / state park near [your city]”.</li>
      <li>Check rest stops, fuel, daylight, weather.</li>
    </ul>
    <h3>Bring</h3>
    <p>Water, snacks, charger, basic first-aid, tell a friend your route.</p>
    ${commonMapsTip}
    ${commonMoreInfo}
  </div>`;
}

function lakesHTML(){
  return `
  <div class="card">
    <h1>Lakes</h1>
    <h3>Find</h3>
    <ul>
      <li>Google Maps: “lake / swimming beach / kayak rental near [your city]”.</li>
      <li>Check park hours, entry fees, swim rules, advisories.</li>
    </ul>
    <h3>Pack</h3>
    <p>Sunscreen, hat, water, towel, trash bag; follow Leave No Trace.</p>
    ${commonMapsTip}
    ${commonMoreInfo}
  </div>`;
}

/******** router/render ********/
function setTitle(route){
  $("#pageTitle").textContent = {
    home:"Home", ssn:"SSN", banking:"Banking (Debit & Credit)", insurance:"Insurance (Health & Car)",
    goc:"Govt Offices & Cards", health:"Health Care", furn:"Furniture & Buying Sites",
    comm:"FB Communities", lic:"License / Permits", temples:"Temples / Faith",
    food:"Food & Restaurants", fun:"Fun Activities", drive:"Scenic Drives", lakes:"Lakes"
  }[route] || "Home";
}
function pageHTML(route){
  switch(route){
    case "home": return homeHTML() + notesBox("home");
    case "ssn": return ssnHTML() + notesBox("ssn");
    case "banking": return bankingHTML() + notesBox("banking");
    case "insurance": return insuranceHTML() + notesBox("insurance");
    case "goc": return gocHTML() + notesBox("goc");
    case "health": return healthHTML() + notesBox("health");
    case "furn": return furnHTML() + notesBox("furn");
    case "comm": return commHTML() + notesBox("comm");
    case "lic": return licHTML() + notesBox("lic");
    case "temples": return templesHTML() + notesBox("temples");
    case "food": return foodHTML() + notesBox("food");
    case "fun": return funHTML() + notesBox("fun");
    case "drive": return driveHTML() + notesBox("drive");
    case "lakes": return lakesHTML() + notesBox("lakes");
    default: return homeHTML() + notesBox("home");
  }
}
function render(){
  // restore session
  const curr = load(KEYS.CURR);
  if (curr){
    const u = (load(KEYS.USERS, [])).find(x=>x.email===curr);
    if (u) currentUser = { email:u.email, name:u.name };
  }
  const route = (location.hash || "#home").replace("#","");
  setTitle(route);
  $("#page").innerHTML = pageHTML(route);

  // load saved profile for this user/guest
  const email = currentUser?.email || "guest";
  const prof = load(KEYS.PROFILE(email), { uni:"", city:"", diet:"any" });
  $("#p_uni").value  = prof.uni || "";
  $("#p_city").value = prof.city || "";
  $("#p_diet").value = prof.diet || "any";
}

/******** events & wiring ********/
// sidebar links already in HTML: use data-sec
$$('.sidebar a[data-sec]').forEach(a=>{
  a.addEventListener('click', (e)=>{
    e.preventDefault();
    location.hash = a.getAttribute('data-sec');
    render();
  });
});
window.addEventListener('hashchange', render);

// login/signup modal
function gate(open=true){
  const g = $("#gate");
  if (open) { g.classList.remove("hide"); g.style.display="grid"; }
  else { g.classList.add("hide"); g.style.display="none"; }
}
$("#openGate").onclick = ()=> gate(true);
$("#closeGate").onclick = ()=> gate(false);

// profile save
$("#saveProfile").onclick = ()=>{
  const email = currentUser?.email || "guest";
  const prof = { uni:$("#p_uni").value.trim(), city:$("#p_city").value.trim(), diet:$("#p_diet").value };
  save(KEYS.PROFILE(email), prof);
  render();
};

// auth buttons
$("#btn_signup").onclick = async ()=>{
  const name = $("#su_name").value.trim();
  const email= $("#su_email").value.trim();
  const pass = $("#su_pass").value;
  const uni  = $("#su_uni").value.trim();
  const city = $("#su_city").value.trim();
  const diet = $("#su_diet").value;
  if (!name || !email || !pass) return alert("Please fill name, email, password");
  try{
    await signUpLocal({name,email,pass,uni,city,diet});
    gate(false);
    render();
  }catch(e){ alert(e.message); }
};
$("#btn_login").onclick = async ()=>{
  const email= $("#li_email").value.trim();
  const pass = $("#li_pass").value;
  if (!email || !pass) return alert("Enter email and password");
  try{
    await loginLocal({email,pass});
    gate(false);
    render();
  }catch(e){ alert(e.message); }
};
$("#btn_demo").onclick = async ()=>{
  const email="demo@local", pass="demo123";
  const users = load(KEYS.USERS, []);
  const ok = users.find(u=>u.email===email);
  if (!ok) await signUpLocal({name:"Demo User",email,pass,uni:"UTA",city:"Arlington, TX",diet:"any"});
  else await loginLocal({email,pass});
  gate(false);
  render();
};
$("#logoutBtn").onclick = ()=> logout();

// boot
render();
