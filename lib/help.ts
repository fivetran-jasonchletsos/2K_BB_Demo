export type HelpEntry = {
  title: string;
  what: string;
  how: string[];
  tryFirst: string;
  related: { href: string; label: string }[];
};

export type NavGroupKey = "PLAY" | "PLAN" | "DATA" | "AI" | "ABOUT";

export const NAV_GROUPS: { key: NavGroupKey; label: string; routes: string[] }[] = [
  {
    key: "PLAY",
    label: "Play",
    routes: ["/scenarios", "/shot-trainer", "/moves", "/codes"],
  },
  {
    key: "PLAN",
    label: "Plan",
    routes: ["/coach", "/path", "/diagnose", "/builds", "/badges", "/tips"],
  },
  {
    key: "DATA",
    label: "Data",
    routes: ["/my-stats", "/my-roster", "/players", "/pulse"],
  },
  {
    key: "AI",
    label: "AI",
    routes: ["/ai"],
  },
  {
    key: "ABOUT",
    label: "About",
    routes: ["/", "/stack", "/connect", "/help"],
  },
];

export const HELP: Record<string, HelpEntry> = {
  "/": {
    title: "Home",
    what:
      "Your dashboard. Player Card on top plus jump-points to every section of the site.",
    how: [
      "Check your Player Card stats at the top of the page.",
      "Scroll through the section grid to see what each area does.",
      "Tap any card to jump straight into that tool.",
      "Use the Help button on any page if you get stuck.",
    ],
    tryFirst: "Tap the Coach card to see today's plan.",
    related: [
      { href: "/coach", label: "Coach" },
      { href: "/diagnose", label: "Diagnose" },
      { href: "/help", label: "Full site guide" },
    ],
  },
  "/coach": {
    title: "Coach",
    what:
      "Daily plan from your activity. The AI agent on this page generates a 7-day plan from your stats.",
    how: [
      "Log a few games on My Stats first so the agent has data.",
      "Tap Generate Plan to ask the agent.",
      "Read today's focus and the drill list.",
      "Check off drills as you complete them.",
      "Come back tomorrow for a fresh plan.",
    ],
    tryFirst: "Tap Generate Plan to see your first daily focus.",
    related: [
      { href: "/my-stats", label: "My Stats" },
      { href: "/diagnose", label: "Diagnose" },
      { href: "/connect", label: "Connect (API key)" },
    ],
  },
  "/path": {
    title: "Path",
    what:
      "11 mastery tiers from ROOKIE to GOAT. Each tier lists concrete criteria you can check off.",
    how: [
      "Find your current tier near the top.",
      "Read the criteria for the next tier up.",
      "Check what you have already met.",
      "Pick one missing criterion to grind this week.",
    ],
    tryFirst: "Find your current tier and read what unlocks the next one.",
    related: [
      { href: "/coach", label: "Coach" },
      { href: "/diagnose", label: "Diagnose" },
      { href: "/tips", label: "Tips" },
    ],
  },
  "/diagnose": {
    title: "Diagnose",
    what:
      "5 questions plus 2 quick drills. Outputs your focus area and a 14-day plan.",
    how: [
      "Answer all 5 questions honestly.",
      "Run the two short drills.",
      "Read your focus area at the bottom.",
      "Save the 14-day plan or open it in Coach.",
    ],
    tryFirst: "Answer question 1 to start the diagnostic.",
    related: [
      { href: "/coach", label: "Coach" },
      { href: "/path", label: "Path" },
      { href: "/shot-trainer", label: "Shot Trainer" },
    ],
  },
  "/ai": {
    title: "AI",
    what:
      "Ask the 2K Expert, see how it works, and build your own agent.",
    how: [
      "Add your Anthropic key on Connect (or skip if a proxy is set).",
      "Type a 2K question in the chat.",
      "Read the answer and follow-up suggestions.",
      "Tap Build your own to assemble a custom agent.",
    ],
    tryFirst: 'Ask: "Best badges for a 6\'5 slasher?"',
    related: [
      { href: "/connect", label: "Connect" },
      { href: "/coach", label: "Coach" },
      { href: "/stack", label: "Stack" },
    ],
  },
  "/my-stats": {
    title: "My Stats",
    what:
      "Log your MyCareer or MyTeam games. Track trends and personal records over time.",
    how: [
      "Tap Add Game.",
      "Enter points, rebounds, assists, win/loss.",
      "Save. The chart updates.",
      "Scroll for personal records and trend lines.",
      "Export to JSON for backup any time.",
    ],
    tryFirst: "Log your last game to seed the trend chart.",
    related: [
      { href: "/coach", label: "Coach" },
      { href: "/my-roster", label: "My Roster" },
      { href: "/path", label: "Path" },
    ],
  },
  "/my-roster": {
    title: "My Roster",
    what:
      "Pin your MyPlayer and starting 5. Save your builds and reference them anywhere on the site.",
    how: [
      "Tap Set MyPlayer to pick your build.",
      "Add your starting 5 from the NBA player database.",
      "Save. Your roster shows on Home and Coach.",
      "Edit anytime.",
    ],
    tryFirst: "Pin your MyPlayer build to the top slot.",
    related: [
      { href: "/builds", label: "Builds" },
      { href: "/players", label: "Players" },
      { href: "/my-stats", label: "My Stats" },
    ],
  },
  "/builds": {
    title: "Builds",
    what:
      "Pick position, body, and archetype. Get attribute caps, badge picks, and VC cost. Compare two builds side-by-side.",
    how: [
      "Pick position and height.",
      "Choose an archetype.",
      "Adjust weight and wingspan.",
      "Review attribute caps and badge picks.",
      "Tap Compare to load a second build.",
    ],
    tryFirst: "Build a 6'5 PG with a Slasher archetype.",
    related: [
      { href: "/badges", label: "Badges" },
      { href: "/my-roster", label: "My Roster" },
      { href: "/path", label: "Path" },
    ],
  },
  "/badges": {
    title: "Badges",
    what:
      "Filter 88 badges by tier and category. Build your own tier list and share it.",
    how: [
      "Pick a category (Shooting, Finishing, Playmaking, Defense).",
      "Tap a badge to see effect and cost.",
      "Drag badges into your tier slots.",
      "Tap Share to copy your list as a code.",
    ],
    tryFirst: "Filter Shooting badges and rank the top three.",
    related: [
      { href: "/builds", label: "Builds" },
      { href: "/tips", label: "Tips" },
      { href: "/scenarios", label: "Scenarios" },
    ],
  },
  "/codes": {
    title: "Codes",
    what:
      "Active locker codes with live expiry. One tap to copy. Mark redeemed to hide them.",
    how: [
      "Scan the active list at the top.",
      "Tap a code to copy it to your clipboard.",
      "Open NBA 2K > MyTeam > Locker Codes and paste.",
      "Tap Mark Redeemed to clean up the list.",
    ],
    tryFirst: "Copy the top code and redeem it in-game.",
    related: [
      { href: "/pulse", label: "Pulse" },
      { href: "/tips", label: "Tips" },
      { href: "/my-stats", label: "My Stats" },
    ],
  },
  "/moves": {
    title: "Moves",
    what:
      "PS5 input combos for 64 moves. Build a combo and practice it with the timer.",
    how: [
      "Filter by category (size-up, escape, finisher).",
      "Tap a move to see the input string.",
      "Drag moves into the combo builder.",
      "Hit Practice to start the timer.",
    ],
    tryFirst: "Open a size-up and read the input string.",
    related: [
      { href: "/shot-trainer", label: "Shot Trainer" },
      { href: "/scenarios", label: "Scenarios" },
      { href: "/tips", label: "Tips" },
    ],
  },
  "/players": {
    title: "Players",
    what:
      "71 NBA stars. Search, compare, and run 1v1 matchup math.",
    how: [
      "Search by name.",
      "Tap a player for full ratings and badges.",
      "Tap Compare to load a second player.",
      "Open the 1v1 view to see the math.",
    ],
    tryFirst: "Compare your favorite player to LeBron.",
    related: [
      { href: "/my-roster", label: "My Roster" },
      { href: "/pulse", label: "Pulse" },
      { href: "/scenarios", label: "Scenarios" },
    ],
  },
  "/scenarios": {
    title: "Scenarios",
    what:
      "36 game decisions. Pick the best read. Track your accuracy and daily streak.",
    how: [
      "Read the scenario setup.",
      "Pick one of the options.",
      "See the explanation and the correct read.",
      "Keep going to build your streak.",
    ],
    tryFirst: "Solve scenario #1 and check your read.",
    related: [
      { href: "/moves", label: "Moves" },
      { href: "/players", label: "Players" },
      { href: "/tips", label: "Tips" },
    ],
  },
  "/shot-trainer": {
    title: "Shot Trainer",
    what:
      "Browser shot meter. Match your jumper. Compete with friends via challenge codes.",
    how: [
      "Pick a jumper preset.",
      "Tap or hold to release at the green window.",
      "Watch your accuracy build over reps.",
      "Tap Challenge to share a code.",
    ],
    tryFirst: "Run 10 reps with the default jumper.",
    related: [
      { href: "/moves", label: "Moves" },
      { href: "/scenarios", label: "Scenarios" },
      { href: "/diagnose", label: "Diagnose" },
    ],
  },
  "/tips": {
    title: "Tips",
    what:
      "74 mechanics and grinding tips. Daily three rotate at midnight. Favorite and learned are tracked.",
    how: [
      "Read today's three tips at the top.",
      "Tap a tip to expand the details.",
      "Mark Learned when you have it down.",
      "Star to favorite for later.",
    ],
    tryFirst: "Open today's first tip and try it once.",
    related: [
      { href: "/coach", label: "Coach" },
      { href: "/moves", label: "Moves" },
      { href: "/badges", label: "Badges" },
    ],
  },
  "/pulse": {
    title: "Pulse",
    what:
      "Live NBA stats predict 2K rating changes. Toggle Live mode to fetch real data.",
    how: [
      "Toggle Live mode on.",
      "Pick a player from the trending list.",
      "Read the predicted rating delta.",
      "Compare to current 2K rating.",
    ],
    tryFirst: "Toggle Live mode and tap the top trending player.",
    related: [
      { href: "/players", label: "Players" },
      { href: "/stack", label: "Stack" },
      { href: "/connect", label: "Connect" },
    ],
  },
  "/stack": {
    title: "Stack",
    what:
      "How this site is built: Fivetran to MDLS Iceberg to Snowflake to dbt to Next.js.",
    how: [
      "Read the pipeline diagram top to bottom.",
      "Tap a layer to see what it does.",
      "Open the GitHub link for the source.",
    ],
    tryFirst: "Tap the Fivetran node to see the connector list.",
    related: [
      { href: "/connect", label: "Connect" },
      { href: "/pulse", label: "Pulse" },
      { href: "/help", label: "Help" },
    ],
  },
  "/connect": {
    title: "Connect",
    what:
      "Paste API keys here. Worker proxy URL is recommended for AI features.",
    how: [
      "Paste your Anthropic API key (optional).",
      "Or paste a Worker proxy URL instead.",
      "Tap Save. Keys stay in your browser only.",
      "Test the connection with the button below.",
    ],
    tryFirst: "Paste a proxy URL and tap Test.",
    related: [
      { href: "/ai", label: "AI" },
      { href: "/coach", label: "Coach" },
      { href: "/stack", label: "Stack" },
    ],
  },
  "/help": {
    title: "Help",
    what:
      "Site map and quick-start. Tap any page card to learn what it does.",
    how: [
      "Read Where to start for three first steps.",
      "Scroll the site map for every page.",
      "Tap the help icon on a card to see details.",
      "Check the FAQ at the bottom.",
    ],
    tryFirst: "Tap the Diagnose card to take the diagnostic.",
    related: [
      { href: "/", label: "Home" },
      { href: "/coach", label: "Coach" },
      { href: "/diagnose", label: "Diagnose" },
    ],
  },
};
