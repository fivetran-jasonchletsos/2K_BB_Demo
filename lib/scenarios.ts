export type ScenarioCategory =
  | "last-shot"
  | "late-defense"
  | "ot"
  | "pnr"
  | "iso"
  | "oot"
  | "ft-game";

export type Option = {
  label: string;
  sub?: string;
  ev: number;
  isOptimal: boolean;
};

export type Reference = {
  kind: "player" | "build" | "badge";
  name: string;
};

export type Scenario = {
  id: string;
  category: ScenarioCategory;
  difficulty: 1 | 2 | 3;
  title: string;
  situation: string[];
  myTeam: string[];
  theirTeam: string[];
  context?: string;
  question: string;
  options: Option[];
  coachingNote: string;
  references?: Reference[];
};

export const CATEGORY_LABEL: Record<ScenarioCategory, string> = {
  "last-shot": "Last Shot",
  "late-defense": "Late Defense",
  ot: "OT",
  pnr: "P&R Read",
  iso: "ISO",
  oot: "OOT",
  "ft-game": "FT Game",
};

export const CATEGORY_ORDER: ScenarioCategory[] = [
  "last-shot",
  "late-defense",
  "ot",
  "pnr",
  "iso",
  "oot",
  "ft-game",
];

export const SCENARIOS: Scenario[] = [
  {
    id: "last-shot-1",
    category: "last-shot",
    difficulty: 2,
    title: "Down 1, 4.2 seconds",
    situation: [
      "Q4 · 0:04.2 left · Down 1",
      "You have ball at half court · 1 TO left",
    ],
    myTeam: ["Maxey (you)", "Harden", "Oubre", "Tucker", "Embiid"],
    theirTeam: ["Holiday", "White", "Brown", "Tatum", "Horford"],
    context:
      "Embiid has Horford on him, mismatch in post. Maxey has Holiday tight. Horford is in foul trouble (4).",
    question: "Best action?",
    options: [
      { label: "ISO Maxey vs Holiday", sub: "Pull-up J", ev: 0.94, isOptimal: false },
      { label: "Post entry to Embiid", sub: "Mismatch + foul draw", ev: 1.18, isOptimal: true },
      { label: "P&R w/ Embiid screen", sub: "Switch and decide", ev: 1.04, isOptimal: false },
      { label: "Call timeout, set ATO", sub: "Burn last TO", ev: 0.86, isOptimal: false },
    ],
    coachingNote:
      "Embiid vs Horford is a 6+ point mismatch on offense and Horford is in foul trouble (4). Even contested in the post, Embiid scores or shoots FTs at a 1.18 PPP clip in this matchup. Pull-ups for Maxey w/ Holiday tight check at ~0.94. Call timeout only if you don't trust the read — but you lose your bailout for the next possession if they score.",
    references: [{ kind: "player", name: "Joel Embiid" }],
  },
  {
    id: "last-shot-2",
    category: "last-shot",
    difficulty: 3,
    title: "Tied, 2.8 seconds, sideline OB",
    situation: [
      "Q4 · 0:02.8 left · Tied",
      "Sideline inbound at half court · 0 TO",
    ],
    myTeam: ["SGA (you)", "Dort", "J. Williams", "Holmgren", "Hartenstein"],
    theirTeam: ["Murray", "Gordon", "MPJ", "A. Gordon", "Jokic"],
    context:
      "Jokic is hedging on any screen — soft drop. SGA has Murray on him. Holmgren can pop or roll. 2.8s is enough for one catch-and-go.",
    question: "What action do you run?",
    options: [
      { label: "Pin-down to SGA, sprint P&R", sub: "Holmgren reject for mid", ev: 1.22, isOptimal: true },
      { label: "Slip alley-oop to Holmgren", sub: "Lob over the top", ev: 0.78, isOptimal: false },
      { label: "Skip pass to MPJ corner 3", sub: "Williams open look", ev: 1.02, isOptimal: false },
      { label: "Iso SGA from inbound catch", sub: "Drive vs Murray", ev: 1.06, isOptimal: false },
    ],
    coachingNote:
      "SGA's mid-range PPP vs drop coverage sits north of 1.20 on pull-ups. Jokic in soft drop with 2.8s left means SGA gets a clean elbow jumper — that's a 52% shot for him this season. The lob needs 3.5s minimum to be clean; defenders front it in late-game. Take the highest-percentage shot from your best player.",
    references: [{ kind: "player", name: "Shai Gilgeous-Alexander" }],
  },
  {
    id: "last-shot-3",
    category: "last-shot",
    difficulty: 1,
    title: "Down 3, 9 seconds, full court",
    situation: [
      "Q4 · 0:09 left · Down 3",
      "You inbound under your own basket · 1 TO",
    ],
    myTeam: ["Curry (you)", "Podziemski", "Wiggins", "Kuminga", "Looney"],
    theirTeam: ["Lillard", "Beasley", "Middleton", "Giannis", "Lopez"],
    context:
      "Giannis is guarding Looney, Lopez sagging deep in the paint. Curry has Beasley on him at the inbound spot.",
    question: "First read?",
    options: [
      { label: "Inbound to Curry, sprint to 3", sub: "Stagger from Looney", ev: 1.18, isOptimal: true },
      { label: "Inbound to Wiggins for 2", sub: "Easy bucket, foul after", ev: 0.62, isOptimal: false },
      { label: "Lob to Kuminga for 3", sub: "Catch-and-shoot corner", ev: 0.84, isOptimal: false },
      { label: "Hold for OT push", sub: "Slow it down", ev: 0.0, isOptimal: false },
    ],
    coachingNote:
      "Down 3, you shoot a 3 — full stop. Curry's catch-and-shoot 3 off a stagger screen is ~42%, which means an EV of 1.18 even with contest. Taking 2 and fouling is a fan trap — you're trading a 42% tie shot for a sub-10% comeback (must foul, they must miss FTs, you must score). Wiggins/Kuminga 3 is fine if it's the open one, but Curry is the read.",
    references: [{ kind: "player", name: "Stephen Curry" }],
  },
  {
    id: "last-shot-4",
    category: "last-shot",
    difficulty: 2,
    title: "Down 2, 6 seconds, no timeouts",
    situation: [
      "Q4 · 0:06 left · Down 2",
      "Defensive rebound just secured · 0 TO",
    ],
    myTeam: ["Luka (you)", "Kyrie", "Klay", "PJ", "Lively"],
    theirTeam: ["CP3", "Brunson", "OG", "Hart", "Robinson"],
    context: "Mitchell Robinson is back protecting the rim. Brunson picked up Luka in transition full court.",
    question: "Push or pull?",
    options: [
      { label: "Push, Luka pull-up 3 in transition", sub: "Before D sets", ev: 1.14, isOptimal: true },
      { label: "Drag screen w/ Lively for 2", sub: "Tie it", ev: 1.06, isOptimal: false },
      { label: "Kick to Klay trailing", sub: "Walk-into 3", ev: 1.10, isOptimal: false },
      { label: "Slow it, set ATO", sub: "No TO available", ev: 0.40, isOptimal: false },
    ],
    coachingNote:
      "Win or lose, no overtime — go for 3. Luka's transition pull-up 3 has hit ~38% all season; multiply by 3 = 1.14 EV. Klay trailing is also a viable option if Luka draws two. The drag for 2 only ties — and you have no TO to advance, meaning their inbound and your defensive transition will be a scramble. Trust your closer.",
    references: [{ kind: "player", name: "Luka Doncic" }],
  },
  {
    id: "late-defense-1",
    category: "late-defense",
    difficulty: 2,
    title: "Up 3, 8 seconds, defense",
    situation: [
      "Q4 · 0:08 left · Up 3",
      "They have ball at half court · 1 TO each",
    ],
    myTeam: ["Mitchell (you)", "Garland", "Strus", "Mobley", "Allen"],
    theirTeam: ["Brunson", "DiVincenzo", "Anunoby", "Hart", "Robinson"],
    context: "Brunson is the priority. Robinson cannot shoot — Allen can leave him to help.",
    question: "Defensive call?",
    options: [
      { label: "Foul up 3 immediately", sub: "Send to FT line", ev: 0.36, isOptimal: true },
      { label: "Switch everything, no 3s", sub: "Run them off the line", ev: 0.78, isOptimal: false },
      { label: "Drop coverage, protect rim", sub: "Give up the 2", ev: 0.62, isOptimal: false },
      { label: "Full denial Brunson", sub: "Make someone else beat you", ev: 0.84, isOptimal: false },
    ],
    coachingNote:
      "Foul-up-3 is the analytically dominant play with 8+ seconds and a TO. They make 2 FTs (~76% Brunson), then you have a 2-point lead with the ball and a TO. Expected points allowed: ~0.36 over the possession. Letting them shoot a 3 — even contested — gives up ~0.78 EV because of the comeback path. Foul before the shooting motion starts.",
    references: [{ kind: "badge", name: "Pickpocket" }],
  },
  {
    id: "late-defense-2",
    category: "late-defense",
    difficulty: 3,
    title: "Up 2, 14 seconds, defense",
    situation: [
      "Q4 · 0:14 left · Up 2",
      "They have ball at half court · 2 TO each · Shot clock off",
    ],
    myTeam: ["Halliburton (you)", "Nembhard", "Mathurin", "Siakam", "Turner"],
    theirTeam: ["Maxey", "Harden", "Oubre", "Tucker", "Embiid"],
    context: "Embiid will iso post. Turner is the only one who can wall up without fouling.",
    question: "How do you play it?",
    options: [
      { label: "Single coverage Turner on Embiid", sub: "Help one pass away", ev: 0.94, isOptimal: true },
      { label: "Double Embiid hard, rotate", sub: "Force kickout 3", ev: 1.08, isOptimal: false },
      { label: "Foul Embiid before catch", sub: "Send him to line", ev: 1.02, isOptimal: false },
      { label: "Switch any screen", sub: "Cross-match", ev: 1.12, isOptimal: false },
    ],
    coachingNote:
      "Turner has the size to single Embiid without committing the second defender. Embiid's contested mid-post jumper is ~46% (0.92 EV). Doubling generates a kickout to Maxey/Oubre/Harden — Philly's catch-and-shoot 3 EV is ~1.10. The fastest path to giving up points is helping off shooters. Stay home, make Embiid earn it over Turner.",
    references: [{ kind: "player", name: "Myles Turner" }],
  },
  {
    id: "late-defense-3",
    category: "late-defense",
    difficulty: 1,
    title: "Up 1, 4 seconds, defense",
    situation: [
      "Q4 · 0:04 left · Up 1",
      "They inbound from half court · 0 TO each",
    ],
    myTeam: ["Jrue (you)", "White", "Brown", "Tatum", "Horford"],
    theirTeam: ["Maxey", "Harden", "Oubre", "Batum", "Embiid"],
    context: "No fouls to give. Embiid is the option to swing-and-shoot.",
    question: "Top priority?",
    options: [
      { label: "Deny Embiid the catch", sub: "Front w/ Horford, weak help", ev: 0.84, isOptimal: true },
      { label: "Full pressure inbounder", sub: "5-second call attempt", ev: 0.96, isOptimal: false },
      { label: "Pack the paint, give up 3", sub: "Live with kickout", ev: 1.06, isOptimal: false },
      { label: "Switch all screens", sub: "Cross-match perimeter", ev: 0.98, isOptimal: false },
    ],
    coachingNote:
      "With 4 seconds and no TO, deny the best shooter/scorer's catch. Embiid fronted with weak-side help is a 0.84 EV possession — they end up forcing it to a non-Embiid look. Pressuring the inbounder concedes the catch to anyone in the gym. Don't pack the paint — Philly will get a clean kickout 3.",
    references: [{ kind: "badge", name: "Glove" }],
  },
  {
    id: "late-defense-4",
    category: "late-defense",
    difficulty: 2,
    title: "Up 3, 23 seconds, defense",
    situation: [
      "Q4 · 0:23 left · Up 3",
      "They have ball, just crossed half · 1 TO each",
    ],
    myTeam: ["Booker (you)", "Beal", "KD", "Nurkic", "Plumlee"],
    theirTeam: ["Lillard", "Beasley", "Middleton", "Giannis", "Lopez"],
    context: "Too much time to just foul. Lillard is the threat off the dribble 3.",
    question: "Call it.",
    options: [
      { label: "Top-lock Lillard, run him off line", sub: "Concede drive", ev: 0.88, isOptimal: true },
      { label: "Foul Lillard immediately", sub: "23s is too much time", ev: 1.18, isOptimal: false },
      { label: "Switch every screen", sub: "Cross-match", ev: 1.12, isOptimal: false },
      { label: "Drop coverage, paint over 3", sub: "Sag off Dame", ev: 1.34, isOptimal: false },
    ],
    coachingNote:
      "23s is past the optimal foul-up-3 window (8-12s is the sweet spot). Top-lock Lillard, force him off the arc, concede the drive — they score 2 and you have ball + 1 lead + a TO with ~15s. Dropping off Lillard is suicide; his pull-up 3 EV is ~1.34. Fouling now gives them a free reset.",
    references: [{ kind: "player", name: "Damian Lillard" }],
  },
  {
    id: "ot-1",
    category: "ot",
    difficulty: 2,
    title: "OT, 3:30 left, tied",
    situation: [
      "OT · 3:30 left · Tied",
      "Your ball, top of key · 2 TO each",
    ],
    myTeam: ["Brunson (you)", "DiVincenzo", "OG", "Hart", "Robinson"],
    theirTeam: ["Mitchell", "Garland", "Strus", "Mobley", "Allen"],
    context: "Mobley has 5 fouls. Allen has 4. Robinson rolling lane = foul magnet.",
    question: "First action of OT?",
    options: [
      { label: "P&R Brunson + Robinson", sub: "Attack Mobley/Allen fouls", ev: 1.16, isOptimal: true },
      { label: "ISO OG vs Strus mismatch", sub: "Bully drive", ev: 1.02, isOptimal: false },
      { label: "Quick 3 from DiVincenzo", sub: "Catch-and-shoot ATO", ev: 1.10, isOptimal: false },
      { label: "Slow it, milk clock", sub: "First-shot conservation", ev: 0.86, isOptimal: false },
    ],
    coachingNote:
      "OT is foul-trouble warfare. Attacking the bigs with P&R forces Mobley/Allen into a switch-or-foul decision — either outcome favors Brunson. Don't be passive in OT; first possession sets tone and the math says aggressive scoring early matters because the sample size is so small. Milking clock with 3:30 left wastes possessions.",
    references: [{ kind: "player", name: "Jalen Brunson" }],
  },
  {
    id: "ot-2",
    category: "ot",
    difficulty: 3,
    title: "OT, 0:45 left, down 2",
    situation: [
      "OT · 0:45 left · Down 2",
      "Defensive rebound just grabbed · 1 TO each",
    ],
    myTeam: ["Tatum (you)", "Holiday", "White", "Brown", "Horford"],
    theirTeam: ["Halliburton", "Nembhard", "Mathurin", "Siakam", "Turner"],
    context: "Indiana plays in drop with Turner. Halliburton has 5 fouls.",
    question: "How do you attack 45s with a 24 shot clock?",
    options: [
      { label: "Walk it up, P&R w/ Horford", sub: "Mid pull-up off drop", ev: 1.18, isOptimal: true },
      { label: "Push it, hunt Halliburton", sub: "Force 6th foul", ev: 1.14, isOptimal: false },
      { label: "Quick 3 from Brown", sub: "Take lead now", ev: 1.06, isOptimal: false },
      { label: "Iso Tatum top of key", sub: "Step-back 3", ev: 1.10, isOptimal: false },
    ],
    coachingNote:
      "45s with a 24 shot clock = exactly one possession each. You want a 2 that ties; they can't catch up if you score, and you defend the final shot. Tatum mid-pull off a Horford screen vs Turner's drop is ~52% (1.04+ EV) and avoids the variance of a 3. Hunting Halliburton's 6th foul is tempting but Turner usually picks up the switch. Don't shoot a quick 3 — let clock tick.",
    references: [{ kind: "player", name: "Jayson Tatum" }],
  },
  {
    id: "ot-3",
    category: "ot",
    difficulty: 1,
    title: "OT, 2:00 left, up 4",
    situation: [
      "OT · 2:00 left · Up 4",
      "Your ball · 1 TO each",
    ],
    myTeam: ["Jokic (you)", "Murray", "MPJ", "A. Gordon", "Watson"],
    theirTeam: ["SGA", "Dort", "J. Williams", "Holmgren", "Hartenstein"],
    context: "SGA has 4 fouls. Holmgren has 4. You can hunt either.",
    question: "Best play?",
    options: [
      { label: "Hunt Holmgren in P&R", sub: "Murray-Jokic action", ev: 1.18, isOptimal: true },
      { label: "Iso Jokic vs Hartenstein", sub: "Post-up elbow", ev: 1.08, isOptimal: false },
      { label: "Spread floor, milk clock", sub: "Take a late shot", ev: 0.96, isOptimal: false },
      { label: "Quick hitter for MPJ", sub: "Pin-down 3", ev: 1.04, isOptimal: false },
    ],
    coachingNote:
      "Up 4 in OT is fragile — one stop + one bucket flips the game. The Murray-Jokic two-man game vs Holmgren forces a switch (mismatch) or a foul (5th on Holmgren = OKC's defensive ceiling drops). Milking is a trap because if they get a stop AND score, you're back to a 1-possession game with less time to respond.",
    references: [{ kind: "player", name: "Nikola Jokic" }],
  },
  {
    id: "pnr-1",
    category: "pnr",
    difficulty: 2,
    title: "Reading the coverage",
    situation: [
      "Q3 · 6:12 left · Tied",
      "Top P&R initiated · Shot clock 14",
    ],
    myTeam: ["Trae (you)", "Bogi", "DJ", "Hunter", "Capela"],
    theirTeam: ["Brunson", "DiVincenzo", "OG", "Hart", "Robinson"],
    context: "Robinson is showing high — 8 feet above the screen. Help defender (Hart) is one-pass away tagging.",
    question: "Trae's read on the high show?",
    options: [
      { label: "Split the show, attack the gap", sub: "Robinson + Brunson recover", ev: 1.22, isOptimal: true },
      { label: "Reject screen, drive opposite", sub: "Force Brunson to chase", ev: 1.04, isOptimal: false },
      { label: "Quick kick to Hunter weak side", sub: "Skip pass", ev: 1.10, isOptimal: false },
      { label: "Pull up over Robinson", sub: "Step-back 3", ev: 0.96, isOptimal: false },
    ],
    coachingNote:
      "When the big shows high (8+ feet above screen), the gap between defenders is exploitable. Splitting puts pressure on the rotation — Hart has to commit, opening Hunter or Capela's roll. Trae's points-per-attack out of split-show is 1.22 in 2K's read engine. Pulling up over Robinson is a contested 3 — only take it if he sags.",
    references: [{ kind: "badge", name: "Quick First Step" }],
  },
  {
    id: "pnr-2",
    category: "pnr",
    difficulty: 3,
    title: "Drop coverage vs roller",
    situation: [
      "Q4 · 3:20 left · Up 2",
      "Side P&R, ball at left wing · Shot clock 18",
    ],
    myTeam: ["LeBron (you)", "AR", "Reaves", "Hachimura", "AD"],
    theirTeam: ["Cade", "Ivey", "Bogdanovic", "Duren", "Stewart"],
    context: "Duren in deep drop (1 foot off the paint). Stewart is tagging the roll man.",
    question: "Best read for LeBron?",
    options: [
      { label: "Pocket pass to AD on roll", sub: "Stewart tag, AD finish vs Duren", ev: 1.24, isOptimal: true },
      { label: "Pull-up mid over Duren", sub: "Drop gives the J", ev: 1.10, isOptimal: false },
      { label: "Skip to Reaves weak corner", sub: "Stewart's man", ev: 1.18, isOptimal: false },
      { label: "Drive baseline at Duren", sub: "Force the rotation", ev: 1.06, isOptimal: false },
    ],
    coachingNote:
      "Drop coverage with a tagger means the roller has a brief window between tag and recovery. AD's roll catch with Stewart late to tag = 1.24 EV. The mid pull-up is mathematically fine (~1.10) but lower than the read. Skip to Reaves works only if Stewart fully commits to the tag — read the help, not the script.",
    references: [{ kind: "player", name: "Anthony Davis" }],
  },
  {
    id: "pnr-3",
    category: "pnr",
    difficulty: 1,
    title: "Switch coverage, mismatch",
    situation: [
      "Q2 · 4:45 left · Tied",
      "Top P&R · Shot clock 16",
    ],
    myTeam: ["Ja (you)", "Smart", "Bane", "JJJ", "Adams"],
    theirTeam: ["Murray", "Gordon", "MPJ", "A. Gordon", "Jokic"],
    context: "Jokic switches onto Ja. Murray now on JJJ.",
    question: "Attack the switch?",
    options: [
      { label: "Iso Ja vs Jokic immediately", sub: "Blow-by drive", ev: 1.20, isOptimal: true },
      { label: "Reset, run another action", sub: "Re-screen", ev: 0.98, isOptimal: false },
      { label: "Post entry to JJJ vs Murray", sub: "Size mismatch", ev: 1.10, isOptimal: false },
      { label: "Pull-up 3 over Jokic", sub: "Sag-off launch", ev: 1.04, isOptimal: false },
    ],
    coachingNote:
      "Switch creates a 1-on-1 mismatch — attack it before the help shifts. Ja vs Jokic in space is a layup or a foul drawn at a 1.20 clip. JJJ in the post vs Murray is fine but slower to develop, giving help time to rotate. Resetting wastes shot clock and lets the defense recover the mismatch.",
    references: [{ kind: "badge", name: "Unpluckable" }],
  },
  {
    id: "iso-1",
    category: "iso",
    difficulty: 2,
    title: "Mismatch in the post",
    situation: [
      "Q3 · 8:00 left · Down 4",
      "Wing iso, shot clock 17",
    ],
    myTeam: ["KD (you)", "Booker", "Beal", "Nurkic", "Plumlee"],
    theirTeam: ["Holiday", "White", "Brown", "Tatum", "Horford"],
    context: "Holiday switched onto KD via P&R. KD has 7-inch height advantage.",
    question: "Best attack?",
    options: [
      { label: "Post-up Holiday, shoot over", sub: "Turnaround face-up", ev: 1.22, isOptimal: true },
      { label: "Face-up jab series", sub: "Pull-up 3", ev: 1.10, isOptimal: false },
      { label: "Drive past Holiday", sub: "Attack the rim", ev: 1.08, isOptimal: false },
      { label: "Kick to Booker, re-post", sub: "Reset for cleaner look", ev: 1.02, isOptimal: false },
    ],
    coachingNote:
      "KD posting a guard is the cleanest mismatch in basketball — turnaround over the shoulder is unblockable at his height. 1.22 EV reflects the ~58% conversion plus FT draws. Driving lets help recover; pulling up 3 wastes the size advantage. Take the highest-percentage shot at the rim level you can.",
    references: [{ kind: "player", name: "Kevin Durant" }],
  },
  {
    id: "iso-2",
    category: "iso",
    difficulty: 3,
    title: "Top of key iso, late clock",
    situation: [
      "Q4 · 1:50 left · Up 1",
      "Shot clock 6 · 1 TO each",
    ],
    myTeam: ["Luka (you)", "Kyrie", "Klay", "PJ", "Lively"],
    theirTeam: ["Jrue", "White", "Brown", "Tatum", "Horford"],
    context: "Jrue tight on Luka. Help is two passes away (sagging on PJ).",
    question: "Final action?",
    options: [
      { label: "Step-back 3 over Jrue", sub: "Snake-dribble create", ev: 1.18, isOptimal: true },
      { label: "Drive at Horford in drop", sub: "Floater range", ev: 1.04, isOptimal: false },
      { label: "Kick to Kyrie, re-iso", sub: "Re-screen action", ev: 0.96, isOptimal: false },
      { label: "Drop pass to Lively", sub: "Pocket cut", ev: 0.86, isOptimal: false },
    ],
    coachingNote:
      "Luka's step-back 3 vs Jrue contested is ~39% — EV 1.17. With 6 on the clock, this is your shot. Driving Horford in drop is mid-range (~1.04). Resetting at 6 seconds is a turnover trap. Bet on your scorer's signature move when the clock forces a decision.",
    references: [{ kind: "player", name: "Luka Doncic" }],
  },
  {
    id: "iso-3",
    category: "iso",
    difficulty: 1,
    title: "Speed mismatch on wing",
    situation: [
      "Q2 · 5:30 left · Tied",
      "Wing iso · Shot clock 14",
    ],
    myTeam: ["Ant (you)", "Conley", "McDaniels", "KAT", "Gobert"],
    theirTeam: ["Brunson", "DiVincenzo", "OG", "Hart", "Robinson"],
    context: "Switch left OG on Ant. Ant has a half-step quickness edge.",
    question: "Move?",
    options: [
      { label: "Drive baseline, dunk attempt", sub: "Beat OG off dribble", ev: 1.20, isOptimal: true },
      { label: "Pull-up 3 over OG", sub: "Settle for jumper", ev: 1.02, isOptimal: false },
      { label: "Kick to Conley, reset", sub: "Run different action", ev: 0.92, isOptimal: false },
      { label: "Post-up OG", sub: "Size battle", ev: 0.86, isOptimal: false },
    ],
    coachingNote:
      "Ant beating OG baseline ends at the rim 60% of the time or a foul 18% — combined EV 1.20. Pulling up is settling. Don't post a wing who has 30+ pounds on you. Speed-mismatch reads beat strength-mismatch reads in 9 out of 10 modern iso decisions.",
    references: [{ kind: "player", name: "Anthony Edwards" }],
  },
  {
    id: "oot-1",
    category: "oot",
    difficulty: 2,
    title: "OOT — sideline OB, down 3",
    situation: [
      "Q4 · 0:18 left · Down 3",
      "Sideline OB half court · 0 TO",
    ],
    myTeam: ["Curry (you)", "Podziemski", "Wiggins", "Kuminga", "Looney"],
    theirTeam: ["Lillard", "Beasley", "Middleton", "Giannis", "Lopez"],
    context: "Giannis on Looney. Wiggins inbounding.",
    question: "Best ATO set?",
    options: [
      { label: "Stagger for Curry → pull-up 3", sub: "Looney + Kuminga screens", ev: 1.20, isOptimal: true },
      { label: "Looney slip after fake screen", sub: "Lob to rim", ev: 0.62, isOptimal: false },
      { label: "Wiggins in, fade for 3 immediately", sub: "Hand-off to Podz", ev: 0.96, isOptimal: false },
      { label: "Drive Curry off DHO, foul-shot", sub: "Take 2 + foul", ev: 0.74, isOptimal: false },
    ],
    coachingNote:
      "Stagger screens get Curry separation — his pull-up 3 EV in this setup is ~1.20. Lobbing Looney is fine vs a smaller match, not Giannis. The lay-in-and-foul math is a fan trap when down 3 with one possession to tie. Run the action that gets your best shooter the cleanest look at the line.",
    references: [{ kind: "player", name: "Stephen Curry" }],
  },
  {
    id: "oot-2",
    category: "oot",
    difficulty: 3,
    title: "OOT — baseline OB, tied",
    situation: [
      "Q4 · 0:11 left · Tied",
      "Baseline OB under own basket · 1 TO each",
    ],
    myTeam: ["Tatum (you)", "Holiday", "White", "Brown", "Horford"],
    theirTeam: ["SGA", "Dort", "J. Williams", "Holmgren", "Hartenstein"],
    context: "Dort on Tatum. Holmgren is rim protecting deep.",
    question: "Best ATO?",
    options: [
      { label: "Cross-screen Horford → Tatum curl jumper", sub: "Mid-elbow look", ev: 1.16, isOptimal: true },
      { label: "Lob to Horford rim", sub: "Holmgren contests", ev: 0.74, isOptimal: false },
      { label: "Quick 3 from Brown corner", sub: "Walk-in look", ev: 1.04, isOptimal: false },
      { label: "Tatum iso wing, step-back 3", sub: "Beat Dort off dribble", ev: 1.10, isOptimal: false },
    ],
    coachingNote:
      "Boston's late-game ATO bread-and-butter: cross screen frees Tatum at the elbow for a mid pull-up — Holmgren can't help without leaving the rim. EV ~1.16. Lobbing into Holmgren is suicide. Brown's corner 3 is fine but Tatum on the catch is the better closer.",
    references: [{ kind: "player", name: "Jayson Tatum" }],
  },
  {
    id: "oot-3",
    category: "oot",
    difficulty: 1,
    title: "OOT — full court advance, down 2",
    situation: [
      "Q4 · 0:03.5 left · Down 2",
      "Sideline OB after advance · 0 TO left",
    ],
    myTeam: ["Halliburton (you)", "Nembhard", "Mathurin", "Siakam", "Turner"],
    theirTeam: ["Brunson", "DiVincenzo", "OG", "Hart", "Robinson"],
    context: "3.5 seconds for a catch-and-shoot 3 OR a catch-and-go 2.",
    question: "Best read?",
    options: [
      { label: "Pin-down to Halliburton → catch 3", sub: "Step-into above break", ev: 1.20, isOptimal: true },
      { label: "Lob to Turner for tie", sub: "OT push", ev: 0.84, isOptimal: false },
      { label: "Quick 2 for Siakam at rim", sub: "Tie game", ev: 1.08, isOptimal: false },
      { label: "Mathurin corner 3 read", sub: "Catch-and-shoot", ev: 1.10, isOptimal: false },
    ],
    coachingNote:
      "Halliburton's 3 wins the game outright. Even at ~40% catch-and-shoot, EV = 1.20 — higher than playing for OT (you only win OT ~50%, so a tie-2 is worth ~1.08). Mathurin in the corner is the secondary read if Halliburton is denied. Always check: does my best 3 EV beat my best 2 EV × OT win%? Usually yes.",
    references: [{ kind: "player", name: "Tyrese Haliburton" }],
  },
  {
    id: "ft-game-1",
    category: "ft-game",
    difficulty: 1,
    title: "Up 3, 18 seconds, FT shooter mode",
    situation: [
      "Q4 · 0:18 left · Up 3",
      "They have ball at half court · 1 TO each",
    ],
    myTeam: ["You", "Conley", "McDaniels", "KAT", "Gobert"],
    theirTeam: ["Lillard", "Beasley", "Middleton", "Giannis", "Lopez"],
    context: "Beasley is a 90% FT shooter. Lopez is 85%. Giannis is 65%.",
    question: "Who do you foul up 3?",
    options: [
      { label: "Foul Giannis", sub: "65% FT shooter", ev: 1.30, isOptimal: true },
      { label: "Foul Beasley", sub: "90% FT shooter", ev: 1.80, isOptimal: false },
      { label: "Foul Lopez", sub: "85% FT shooter", ev: 1.70, isOptimal: false },
      { label: "No foul, defend the 3", sub: "Live with it", ev: 0.92, isOptimal: false },
    ],
    coachingNote:
      "If you foul, foul the worst FT shooter on the floor. Giannis at 65% means 2 FT = 1.30 expected. Beasley at 90% means 1.80 expected. The foul-up-3 math only works against poor FT shooters — Giannis is one of the few stars who fits. If only good FT shooters are out there, take your chances on D.",
    references: [{ kind: "badge", name: "Free Throw Ace" }],
  },
  {
    id: "ft-game-2",
    category: "ft-game",
    difficulty: 2,
    title: "Down 5, 35 seconds, fouling decisions",
    situation: [
      "Q4 · 0:35 left · Down 5",
      "They just inbounded · 1 TO each",
    ],
    myTeam: ["You", "Maxey", "Harden", "Oubre", "Embiid"],
    theirTeam: ["Westbrook", "Reaves", "AR", "Hachimura", "AD"],
    context: "Westbrook is 65% from line. AD is 80%. Reaves is 86%.",
    question: "Who do you target?",
    options: [
      { label: "Foul Westbrook immediately", sub: "Lowest FT% on floor", ev: 1.30, isOptimal: true },
      { label: "Foul AD on the catch", sub: "Force missed 2nd", ev: 1.60, isOptimal: false },
      { label: "Foul next non-Westbrook receiver", sub: "Generic foul", ev: 1.72, isOptimal: false },
      { label: "Stay home, contest shot", sub: "Run clock instead", ev: 1.50, isOptimal: false },
    ],
    coachingNote:
      "Hunt the worst FT shooter on the court. Westbrook at 65% means each foul produces 1.30 expected points — and a missed second FT is a possession. Generic fouling burns clock without optimizing math. With 35s and down 5, you need 3 possessions; every percentage point matters.",
    references: [{ kind: "player", name: "Russell Westbrook" }],
  },
  {
    id: "ft-game-3",
    category: "ft-game",
    difficulty: 3,
    title: "Up 4, 24 seconds, fouling debate",
    situation: [
      "Q4 · 0:24 left · Up 4",
      "They have ball, half court · 1 TO each",
    ],
    myTeam: ["You", "SGA", "Dort", "J. Williams", "Holmgren"],
    theirTeam: ["Curry", "Podziemski", "Wiggins", "Kuminga", "Looney"],
    context: "Curry has the ball. Looney is on the floor (60% FT).",
    question: "Best play?",
    options: [
      { label: "Don't foul · play straight-up D", sub: "2-possession game still", ev: 0.96, isOptimal: true },
      { label: "Foul Looney immediately", sub: "60% shooter", ev: 1.20, isOptimal: false },
      { label: "Foul Curry, hope for miss", sub: "92% shooter — risky", ev: 1.84, isOptimal: false },
      { label: "Switch every screen, no help", sub: "Force a 2", ev: 1.12, isOptimal: false },
    ],
    coachingNote:
      "Up 4 is a 2-possession lead — a 3 doesn't tie. Don't foul. Even fouling Looney costs you 1.20 expected points and concedes possession value. Defend straight-up; force a contested 2 or 3, then handle their late foul on you. Fouling up 4 is the most common analytical mistake at the youth and casual level.",
    references: [{ kind: "badge", name: "Challenger" }],
  },
];

export function getScenariosByCategory(
  category: ScenarioCategory | "all"
): Scenario[] {
  if (category === "all") return SCENARIOS;
  return SCENARIOS.filter((s) => s.category === category);
}

export function getScenarioById(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

export function getRandomScenario(pool: Scenario[] = SCENARIOS): Scenario {
  return pool[Math.floor(Math.random() * pool.length)];
}

// Stable string hash → 32-bit unsigned int. Used for daily-drill seeding.
export function hashDate(s: string): number {
  let h = 2166136261 >>> 0; // FNV-1a init
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

// Deterministic 3-scenario set for a given yyyy-mm-dd date string.
export function getDailyScenarios(date: string, count: number = 3): Scenario[] {
  const pool = [...SCENARIOS];
  let seed = hashDate(date) || 1;
  const rand = () => {
    seed = (Math.imul(seed, 9301) + 49297) >>> 0;
    seed = seed % 233280;
    return seed / 233280;
  };
  // Fisher-Yates with seeded RNG
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}

export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function yesterdayKey(d: Date = new Date()): string {
  const y = new Date(d.getTime() - 24 * 60 * 60 * 1000);
  return todayKey(y);
}

export type PerScenarioStatus =
  | "unseen"
  | "optimal"
  | "suboptimal"
  | "skipped"
  | "learned";

export type ProgressState = {
  played: number;
  optimal: number;
  streak: number;
  bestStreak: number;
  perScenarioStatus: Record<string, PerScenarioStatus>;
};

export const EMPTY_PROGRESS: ProgressState = {
  played: 0,
  optimal: 0,
  streak: 0,
  bestStreak: 0,
  perScenarioStatus: {},
};

export type CategoryBest = {
  category: ScenarioCategory;
  label: string;
  pct: number;
};

export function computeProgressStats(progress: ProgressState): {
  played: number;
  optimal: number;
  pctOptimal: number;
  streak: number;
  bestStreak: number;
  categoryBest: CategoryBest | null;
  perCategory: Array<{
    category: ScenarioCategory;
    label: string;
    played: number;
    optimal: number;
    pct: number;
  }>;
} {
  const pctOptimal =
    progress.played > 0
      ? Math.round((progress.optimal / progress.played) * 100)
      : 0;

  const perCategory = CATEGORY_ORDER.map((cat) => {
    const ids = SCENARIOS.filter((s) => s.category === cat).map((s) => s.id);
    let played = 0;
    let optimal = 0;
    for (const id of ids) {
      const status = progress.perScenarioStatus[id];
      if (status === "optimal") {
        played++;
        optimal++;
      } else if (status === "suboptimal") {
        played++;
      }
    }
    const pct = played > 0 ? Math.round((optimal / played) * 100) : 0;
    return { category: cat, label: CATEGORY_LABEL[cat], played, optimal, pct };
  });

  const best = perCategory
    .filter((c) => c.played >= 1)
    .sort((a, b) => b.pct - a.pct)[0];

  return {
    played: progress.played,
    optimal: progress.optimal,
    pctOptimal,
    streak: progress.streak,
    bestStreak: progress.bestStreak,
    categoryBest: best
      ? { category: best.category, label: best.label, pct: best.pct }
      : null,
    perCategory,
  };
}
