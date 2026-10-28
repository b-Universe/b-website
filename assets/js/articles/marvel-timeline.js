const TIMELINE_DATA = [
  // ERA 1: ANCIENT HISTORY & GOLDEN AGE (WWII)
  {
    id: "eyes-of-wakanda",
    era: "origins",
    eraTitle: "Era 1: Ancient History & The Golden Age (1200 BC - 1947)",
    eraDesc: "The birth of Wakandan artifacts, the Tesseract on Earth, and the WWII super-soldier program.",
    title: "Eyes Of Wakanda (Season 1)",
    type: "Show",
    inUniverseYear: "1200 BC - 1896 AD",
    releaseYear: "2025",
    doomsdayKey: false,
    summary: "Anthology following Hatut Zeraze (War Dogs) operatives across centuries recovering stolen Vibranium artifacts around the globe.",
    extras: [
      "Establishes ancient Vibranium relics and global Wakandan intelligence networks prior to the 20th century."
    ]
  },
  {
    id: "cap-first-avenger",
    era: "origins",
    title: "Captain America: The First Avenger",
    type: "Movie",
    inUniverseYear: "1942 - 1945",
    releaseYear: "2011",
    doomsdayKey: true,
    summary: "Steve Rogers becomes Captain America to battle Johann Schmidt (Red Skull) and HYDRA's weaponization of the Tesseract (Space Stone).",
    extras: [
      "Closing Scene: Steve wakes up in 2011 Times Square.",
      "Post-Credits Scene: Nick Fury recruits Steve for the Avengers Initiative (leads into The Avengers)."
    ]
  },
  {
    id: "oneshot-agent-carter",
    era: "origins",
    title: "Marvel One-Shot: Agent Carter",
    type: "One-Shot",
    inUniverseYear: "1946",
    releaseYear: "2013",
    doomsdayKey: false,
    summary: "Peggy Carter retrieves the mysterious Zodiac serum single-handedly before being recruited by Howard Stark to co-found S.H.I.E.L.D.",
    extras: [
      "Included on the Iron Man 3 Blu-ray and Disney+ extras."
    ]
  },
  {
    id: "agent-carter-s1",
    era: "origins",
    title: "Agent Carter (Season 1)",
    type: "Show",
    inUniverseYear: "1946",
    releaseYear: "2015",
    doomsdayKey: false,
    summary: "Peggy Carter clears Howard Stark's name with Edwin Jarvis while uncovering the Soviet Leviathan organization and early Black Widow program roots.",
    extras: [
      "Finale Stinger: Arnim Zola meets Johann Fennhoff in prison, planting the seeds for HYDRA's infiltration of S.H.I.E.L.D."
    ]
  },
  {
    id: "agent-carter-s2",
    era: "origins",
    title: "Agent Carter (Season 2)",
    type: "Show",
    inUniverseYear: "1947",
    releaseYear: "2016",
    doomsdayKey: false,
    summary: "Peggy relocates to Los Angeles to investigate Zero Matter (Darkforce) anomalies and the Council of Nine.",
    extras: [
      "Introduces Zero Matter / Darkforce energy later referenced in Doctor Strange and Agents of S.H.I.E.L.D."
    ]
  },

  // ERA 2: MULTIVERSE LEGACY & RETRO-FUTURISM (1962 - 2005)
  {
    id: "xmen-first-class",
    era: "multiverse-legacy",
    eraTitle: "Era 2: Retro-Futurism, Mutant Legacy & The 90s (1962 - 1995)",
    eraDesc: "Parallel Earth-828's 1960s origins, Earth-10005's mutant foundations, and Carol Danvers' 1995 arrival.",
    title: "X-Men: First Class (Earth-10005)",
    type: "Multiverse",
    inUniverseYear: "1962 (Earth-10005)",
    releaseYear: "2011",
    doomsdayKey: true,
    summary: "Charles Xavier and Erik Lehnsherr (Magneto) form the first class of mutants during the Cuban Missile Crisis.",
    extras: [
      "Essential mutant background for the returning Fox X-Men cast in Avengers: Doomsday."
    ]
  },
  {
    id: "fantastic-four-first-steps",
    era: "multiverse-legacy",
    title: "The Fantastic Four: First Steps (Earth-828)",
    type: "Movie",
    inUniverseYear: "1964 (Earth-828)",
    releaseYear: "2025",
    doomsdayKey: true,
    summary: "On a retro-futuristic 1960s alternate Earth, Reed Richards, Sue Storm, Johnny Storm, and Ben Grimm defend their world from Galactus and the Silver Surfer (Shalla-Bal).",
    extras: [
      "Mid-Credits Scene: Doctor Victor Von Doom appears in the Baxter Building with young Franklin Richards.",
      "Post-Credits Scene: The Fantastic Four's excelsior spacecraft breaches dimensional space into Earth-616 (seen from Thunderbolts*)."
    ]
  },
  {
    id: "xmen-days-of-future-past",
    era: "multiverse-legacy",
    title: "X-Men: Days Of Future Past (Earth-10005)",
    type: "Multiverse",
    inUniverseYear: "1973 / 2023 (Earth-10005)",
    releaseYear: "2014",
    doomsdayKey: true,
    summary: "Wolverine's consciousness is sent back to 1973 to stop Mystique from triggering the Sentinel program, splitting the mutant timeline.",
    extras: [
      "Unites the original 2000s X-Men cast (Patrick Stewart, Ian McKellen, James Marsden, Alan Cumming, Rebecca Romijn, Kelsey Grammer) returning in Doomsday."
    ]
  },
  {
    id: "xmen-trilogy-legacy",
    era: "multiverse-legacy",
    title: "X-Men / X2: X-Men United / X-Men: The Last Stand",
    type: "Multiverse",
    inUniverseYear: "2000 - 2006 (Earth-10005)",
    releaseYear: "2000 - 2006",
    doomsdayKey: true,
    summary: "The core battles between Xavier's X-Men and Magneto's Brotherhood, introducing Cyclops, Nightcrawler, Beast, Mystique, Professor X, and Magneto.",
    extras: [
      "X-Men: The Last Stand Post-Credits: Charles Xavier's consciousness survives in a comatose patient on Muir Island."
    ]
  },
  {
    id: "captain-marvel",
    era: "multiverse-legacy",
    title: "Captain Marvel",
    type: "Movie",
    inUniverseYear: "1995",
    releaseYear: "2019",
    doomsdayKey: false,
    summary: "Vers (Carol Danvers) crashes to Earth during the Kree-Skrull war, uncovers her past with Nick Fury, and unlocks her cosmic powers via the Tesseract.",
    extras: [
      "Mid-Credits Scene (Chronological Warning - Set in 2018): Carol answers Fury's pager at Avengers Compound right after Infinity War.",
      "Post-Credits Scene (1995): Goose the Flerken regurgitates the Tesseract onto Nick Fury's desk."
    ]
  },

  // ERA 3: DAWN OF THE AVENGERS (2008 - 2014)
  {
    id: "iron-man",
    era: "avengers-dawn",
    eraTitle: "Era 3: Dawn Of The Avengers (2008 - 2014)",
    eraDesc: "The Avengers Initiative forms, Loki invades New York, and HYDRA's secret control is exposed.",
    title: "Iron Man",
    type: "Movie",
    inUniverseYear: "2008",
    releaseYear: "2008",
    doomsdayKey: true,
    summary: "Captured industrialist Tony Stark builds a powered suit of armor to escape captivity and becomes Iron Man.",
    extras: [
      "Post-Credits Scene: Nick Fury breaks into Stark's mansion in Malibu to tell him about the Avengers Initiative."
    ]
  },
  {
    id: "iron-man-2",
    era: "avengers-dawn",
    title: "Iron Man 2",
    type: "Movie",
    inUniverseYear: "2010",
    releaseYear: "2010",
    doomsdayKey: false,
    summary: "Tony faces government pressure, palladium poisoning, and Ivan Vanko (Whiplash) while Natasha Romanoff (Black Widow) evaluates him for S.H.I.E.L.D.",
    extras: [
      "Post-Credits Scene: Agent Phil Coulson arrives at a crater in New Mexico and reports the discovery of Mjolnir."
    ]
  },
  {
    id: "incredible-hulk",
    era: "avengers-dawn",
    title: "The Incredible Hulk",
    type: "Movie",
    inUniverseYear: "2010",
    releaseYear: "2008",
    doomsdayKey: false,
    summary: "Bruce Banner evades General Thaddeus 'Thunderbolt' Ross while Emil Blonsky transforms into the Abomination in Harlem.",
    extras: [
      "Pre-Credits Stinger: Tony Stark approaches General Ross in a bar to tell him a team is being put together.",
      "Introduces Samuel Sterns (The Leader) and Betty Ross, who return in Captain America: Brave New World."
    ]
  },
  {
    id: "oneshot-thors-hammer",
    era: "avengers-dawn",
    title: "Marvel One-Shot: A Funny Thing Happened On The Way To Thor's Hammer",
    type: "One-Shot",
    inUniverseYear: "2010",
    releaseYear: "2011",
    doomsdayKey: false,
    summary: "En route to Albuquerque, Agent Coulson stops a gas station robbery while picking out donuts.",
    extras: [
      "Takes place during the middle of Iron Man 2 right before Coulson arrives in New Mexico."
    ]
  },
  {
    id: "thor",
    era: "avengers-dawn",
    title: "Thor",
    type: "Movie",
    inUniverseYear: "2010",
    releaseYear: "2011",
    doomsdayKey: true,
    summary: "Banished to Earth by Odin, Thor learns humility in New Mexico while Loki seizes the throne of Asgard.",
    extras: [
      "Post-Credits Scene: Nick Fury shows Erik Selvig the Tesseract; a reflection reveals Loki controlling Selvig."
    ]
  },
  {
    id: "oneshot-the-consultant",
    era: "avengers-dawn",
    title: "Marvel One-Shot: The Consultant",
    type: "One-Shot",
    inUniverseYear: "2010",
    releaseYear: "2011",
    doomsdayKey: false,
    summary: "Agents Coulson and Sitwell send Tony Stark to annoy General Ross so the World Security Council won't put Emil Blonsky on the Avengers.",
    extras: [
      "Directly contextualizes the final bar scene of The Incredible Hulk."
    ]
  },
  {
    id: "the-avengers",
    era: "avengers-dawn",
    title: "The Avengers",
    type: "Movie",
    inUniverseYear: "2012",
    releaseYear: "2012",
    doomsdayKey: true,
    summary: "Iron Man, Captain America, Thor, Hulk, Black Widow, and Hawkeye unite to stop Loki and the Chitauri invasion of New York.",
    extras: [
      "Mid-Credits Scene: The Other reports Earth's victory to Thanos, who smiles at the idea of courting Death.",
      "Post-Credits Scene: The exhausted Avengers eat shawarma in silence at a damaged New York restaurant."
    ]
  },
  {
    id: "oneshot-item-47",
    era: "avengers-dawn",
    title: "Marvel One-Shot: Item 47",
    type: "One-Shot",
    inUniverseYear: "2012",
    releaseYear: "2012",
    doomsdayKey: false,
    summary: "A young couple finds a discarded Chitauri weapon after the Battle of New York and robs banks until S.H.I.E.L.D. Agents Sitwell and Blake recruit them.",
    extras: [
      "Direct aftermath of the Battle of New York."
    ]
  },
  {
    id: "thor-dark-world",
    era: "avengers-dawn",
    title: "Thor: The Dark World",
    type: "Movie",
    inUniverseYear: "2013",
    releaseYear: "2013",
    doomsdayKey: false,
    summary: "Jane Foster absorbs the Aether (Reality Stone), forcing Thor into an uneasy alliance with Loki against Malekith the Accursed.",
    extras: [
      "Mid-Credits Scene: Sif and Volstagg entrust the Aether to Taneleer Tivan (The Collector) on Knowhere.",
      "Post-Credits Scene: Thor returns to London to kiss Jane while a Frost Beast chases birds through an industrial yard."
    ]
  },
  {
    id: "iron-man-3",
    era: "avengers-dawn",
    title: "Iron Man 3",
    type: "Movie",
    inUniverseYear: "December 2013",
    releaseYear: "2013",
    doomsdayKey: false,
    summary: "Haunted by PTSD from New York, Tony Stark battles Aldrich Killian's Extremis soldiers and uncovers the truth behind actor Trevor Slattery's Mandarin persona.",
    extras: [
      "Post-Credits Scene: Reveals Tony was recounting the entire story to a sleeping Bruce Banner."
    ]
  },
  {
    id: "oneshot-all-hail-the-king",
    era: "avengers-dawn",
    title: "Marvel One-Shot: All Hail The King",
    type: "One-Shot",
    inUniverseYear: "2014",
    releaseYear: "2014",
    doomsdayKey: false,
    summary: "Imprisoned actor Trevor Slattery is interviewed in Seagate Prison by a fake journalist who is actually an agent of the real Ten Rings.",
    extras: [
      "Directly sets up Xu Wenwu and Trevor Slattery's return in Shang-Chi and the Legend of the Ten Rings."
    ]
  },
  {
    id: "cap-winter-soldier",
    era: "avengers-dawn",
    title: "Captain America: The Winter Soldier",
    type: "Movie",
    inUniverseYear: "2014",
    releaseYear: "2014",
    doomsdayKey: true,
    summary: "Steve Rogers, Natasha Romanoff, and Sam Wilson (Falcon) uncover HYDRA's decades-long infiltration of S.H.I.E.L.D. and confront Bucky Barnes as the Winter Soldier.",
    extras: [
      "Mid-Credits Scene: Baron Strucker reveals Loki's scepter and the twins Pietro and Wanda Maximoff in Sokovia.",
      "Post-Credits Scene: Bucky Barnes visits the Captain America exhibit at the Smithsonian."
    ]
  },
  {
    id: "guardians-vol-1",
    era: "avengers-dawn",
    title: "Guardians Of The Galaxy",
    type: "Movie",
    inUniverseYear: "2014",
    releaseYear: "2014",
    doomsdayKey: false,
    summary: "Peter Quill, Gamora, Drax, Rocket, and Groot band together to stop Ronan the Accuser from destroying Xandar with the Power Stone.",
    extras: [
      "Pre-Credits Scene: Baby Groot dances to The Jackson 5 in his pot whenever Drax isn't looking.",
      "Post-Credits Scene: Howard the Duck drinks a cocktail in the ruins of the Collector's museum."
    ]
  },
  {
    id: "guardians-vol-2",
    era: "avengers-dawn",
    title: "Guardians Of The Galaxy Vol. 2",
    type: "Movie",
    inUniverseYear: "2014",
    releaseYear: "2017",
    doomsdayKey: false,
    summary: "The Guardians discover the truth about Peter Quill's celestial father, Ego the Living Planet, while Yondu sacrifices himself for Peter.",
    extras: [
      "5 Credit Stingers: (1) Kraglin practices Yondu's arrow; (2) Stakar Ogord reunites the original Ravagers; (3) Ayesha creates Adam Warlock's cocoon; (4) Teen Groot plays video games; (5) Stan Lee talks to the Watchers."
    ]
  },
  {
    id: "i-am-groot",
    era: "avengers-dawn",
    title: "I Am Groot (Seasons 1 & 2)",
    type: "One-Shot",
    inUniverseYear: "2014",
    releaseYear: "2022 - 2023",
    doomsdayKey: false,
    summary: "Ten animated shorts following Baby Groot's cosmic misadventures between Guardians Vol. 1 and Vol. 2, culminating in an encounter with Uatu the Watcher.",
    extras: [
      "Season 2 Finale connects Uatu the Watcher directly to the main Earth-616 timeline."
    ]
  },

  // ERA 4: AGE OF ULTRON & DEFENDERS STREET LEVEL (2014 - 2016)
  {
    id: "daredevil-s1",
    era: "age-of-heroes",
    eraTitle: "Era 4: Age Of Ultron & Street-Level Heroes (2014 - 2016)",
    eraDesc: "The Defenders rise in Post-Chitauri New York while Ultron pushes the world toward the Sokovia Accords.",
    title: "Daredevil (Season 1)",
    type: "Show",
    inUniverseYear: "Late 2014",
    releaseYear: "2015",
    doomsdayKey: false,
    summary: "Blind lawyer Matt Murdock protects Hell's Kitchen from Wilson Fisk's (Kingpin) criminal empire created in the wake of the 2012 Battle of New York.",
    extras: [
      "Canonically integrated into the Disney+ MCU timeline ahead of Daredevil: Born Again."
    ]
  },
  {
    id: "jessica-jones-s1",
    era: "age-of-heroes",
    title: "Jessica Jones (Season 1)",
    type: "Show",
    inUniverseYear: "Early 2015",
    releaseYear: "2015",
    doomsdayKey: false,
    summary: "Private investigator Jessica Jones teams up with Luke Cage to stop the mind-controlling sociopath Kilgrave.",
    extras: [
      "Introduces Luke Cage and sets up Jessica's return in Daredevil: Born Again Season 2."
    ]
  },
  {
    id: "avengers-age-of-ultron",
    era: "age-of-heroes",
    title: "Avengers: Age Of Ultron",
    type: "Movie",
    inUniverseYear: "2015",
    releaseYear: "2015",
    doomsdayKey: true,
    summary: "Tony Stark and Bruce Banner use the Mind Stone to create Ultron, leading to the birth of Vision, the recruitment of Wanda Maximoff, and the destruction of Sokovia.",
    extras: [
      "Mid-Credits Scene: Thanos retrieves the Infinity Gauntlet from a vault and says, 'Fine, I'll do it myself.'"
    ]
  },
  {
    id: "whih-newsfront-s1",
    era: "age-of-heroes",
    title: "WHIH Newsfront (Web Series - Season 1)",
    type: "One-Shot",
    inUniverseYear: "July 2015",
    releaseYear: "2015",
    doomsdayKey: false,
    summary: "Christine Everhart reports on the fallout of Sokovia and interviews Scott Lang in prison ahead of his release.",
    extras: [
      "5-part canonical promotional web series bridging Age of Ultron and Ant-Man."
    ]
  },
  {
    id: "ant-man",
    era: "age-of-heroes",
    title: "Ant-Man",
    type: "Movie",
    inUniverseYear: "2015",
    releaseYear: "2015",
    doomsdayKey: false,
    summary: "Hank Pym and Hope van Dyne recruit master thief Scott Lang to prevent Darren Cross from selling the Yellowjacket shrinking technology to HYDRA.",
    extras: [
      "Mid-Credits Scene: Hank Pym shows Hope a prototype Wasp suit.",
      "Post-Credits Scene: Steve Rogers and Sam Wilson have Bucky Barnes in a vise (clip from Captain America: Civil War)."
    ]
  },
  {
    id: "daredevil-s2",
    era: "age-of-heroes",
    title: "Daredevil (Season 2)",
    type: "Show",
    inUniverseYear: "Late 2015",
    releaseYear: "2016",
    doomsdayKey: false,
    summary: "Matt Murdock clashes with Frank Castle (The Punisher) over vigilante justice while Elektra Natchios returns to battle the ancient ninja clan The Hand.",
    extras: [
      "Debut of Jon Bernthal's Punisher."
    ]
  },
  {
    id: "luke-cage-s1",
    era: "age-of-heroes",
    title: "Luke Cage (Season 1)",
    type: "Show",
    inUniverseYear: "Late 2015",
    releaseYear: "2016",
    doomsdayKey: false,
    summary: "Bulletproof hero Luke Cage defends Harlem against Cottonmouth, Mariah Dillard, and Diamondback.",
    extras: [
      "Features Hammer Industries Judas bullets Reverse-engineered from Chitauri metal."
    ]
  },
  {
    id: "iron-fist-s1",
    era: "age-of-heroes",
    title: "Iron Fist (Season 1)",
    type: "Show",
    inUniverseYear: "Early 2016",
    releaseYear: "2017",
    doomsdayKey: false,
    summary: "Danny Rand returns to New York after 15 years in K'un-Lun with the power of the Iron Fist to reclaim his family's company from The Hand.",
    extras: [
      "Leads directly into The Defenders."
    ]
  },
  {
    id: "the-defenders",
    era: "age-of-heroes",
    title: "The Defenders (Limited Series)",
    type: "Show",
    inUniverseYear: "Early 2016",
    releaseYear: "2017",
    doomsdayKey: false,
    summary: "Daredevil, Jessica Jones, Luke Cage, and Iron Fist team up to stop Alexandra and The Hand from hollowing out the dragon bones beneath Midland Circle.",
    extras: [
      "Finale Stinger: A gravely injured Matt Murdock wakes up in a convent cared for by Sister Maggie (sets up Daredevil Season 3)."
    ]
  },

  // ERA 5: CIVIL WAR TO THE INFINITY WAR (2016 - 2023)
  {
    id: "whih-newsfront-s2",
    era: "civil-war-infinity",
    eraTitle: "Era 5: Civil War To The Infinity War (2016 - 2023)",
    eraDesc: "The Avengers fracture under the Sokovia Accords, leaving Earth vulnerable to Thanos and the Blip.",
    title: "WHIH Newsfront (Web Series - Season 2)",
    type: "One-Shot",
    inUniverseYear: "Spring 2016",
    releaseYear: "2016",
    doomsdayKey: false,
    summary: "Christine Everhart and Will Adams debate whether the Avengers should be regulated by world governments.",
    extras: [
      "Ends with breaking news of the attack in Lagos, Nigeria (opening scene of Civil War)."
    ]
  },
  {
    id: "cap-civil-war",
    era: "civil-war-infinity",
    title: "Captain America: Civil War",
    type: "Movie",
    inUniverseYear: "2016",
    releaseYear: "2016",
    doomsdayKey: true,
    summary: "Helmut Zemo exploits the Sokovia Accords and the murder of Tony Stark's parents to shatter the Avengers from within. Introduces Black Panther and Spider-Man.",
    extras: [
      "Mid-Credits Scene: Bucky Barnes goes into cryo-sleep in Wakanda under T'Challa's protection.",
      "Post-Credits Scene: Peter Parker discovers the Spider-Signal projection built into his web-shooters by Tony Stark."
    ]
  },
  {
    id: "oneshot-team-thor",
    era: "civil-war-infinity",
    title: "Team Thor Part 1, Part 2 & Team Darryl (Mockumentaries)",
    type: "One-Shot",
    inUniverseYear: "2016 - 2018 (Non-Canon Satire)",
    releaseYear: "2016 - 2018",
    doomsdayKey: false,
    summary: "Taika Waititi's comedic shorts showing Thor and Bruce Banner living with an Australian office worker named Darryl during Civil War.",
    extras: [
      "Darryl Jacobson later makes a canonical MCU cameo as a tour guide in New Asgard in Thor: Love and Thunder."
    ]
  },
  {
    id: "black-widow",
    era: "civil-war-infinity",
    title: "Black Widow",
    type: "Movie",
    inUniverseYear: "2016",
    releaseYear: "2021",
    doomsdayKey: true,
    summary: "On the run after Civil War, Natasha Romanoff reunites with Yelena Belova, Alexei Shostakov (Red Guardian), and Melina Vostokoff to destroy the Red Room.",
    extras: [
      "Post-Credits Scene (Chronological Warning - Set in 2024 after Endgame): Valentina Allegra de Fontaine visits Natasha's grave and targets Clint Barton for Yelena."
    ]
  },
  {
    id: "black-panther",
    era: "civil-war-infinity",
    title: "Black Panther",
    type: "Movie",
    inUniverseYear: "2016",
    releaseYear: "2018",
    doomsdayKey: true,
    summary: "Newly crowned King T'Challa defends Wakanda's throne and Vibranium legacy against his cousin Erik 'Killmonger' Stevens.",
    extras: [
      "Mid-Credits Scene: T'Challa addresses the United Nations in Vienna to end Wakanda's isolation.",
      "Post-Credits Scene: A healed Bucky Barnes wakes up in Wakanda and is greeted by Shuri as 'White Wolf'."
    ]
  },
  {
    id: "spiderman-homecoming",
    era: "civil-war-infinity",
    title: "Spider-Man: Homecoming",
    type: "Movie",
    inUniverseYear: "Fall 2016",
    releaseYear: "2017",
    doomsdayKey: false,
    summary: "Peter Parker balances high school life with stopping Adrian Toomes (Vulture) from selling salvaged Chitauri and Ultron weapons.",
    extras: [
      "Mid-Credits Scene: Mac Gargan (Scorpion) confronts Toomes in prison about Spider-Man's identity.",
      "Post-Credits Scene: Captain America delivers a PSA about the value of patience."
    ]
  },
  {
    id: "punisher-s1",
    era: "civil-war-infinity",
    title: "The Punisher (Season 1)",
    type: "Show",
    inUniverseYear: "Late 2016",
    releaseYear: "2017",
    doomsdayKey: false,
    summary: "Frank Castle partners with NSA analyst Micro to uncover the CIA conspiracy behind his family's murder and his former best friend Billy Russo.",
    extras: [
      "Establishes Frank Castle's solo arc leading into Born Again and One Last Kill."
    ]
  },
  {
    id: "doctor-strange",
    era: "civil-war-infinity",
    title: "Doctor Strange",
    type: "Movie",
    inUniverseYear: "2016 - 2017",
    releaseYear: "2016",
    doomsdayKey: true,
    summary: "After a car crash ruins his hands, neurosurgeon Stephen Strange travels to Kamar-Taj, masters the Mystic Arts with the Time Stone, and bargains with Dormammu.",
    extras: [
      "Mid-Credits Scene: Strange offers to help Thor and Loki find Odin in New York (clip from Thor: Ragnarok).",
      "Post-Credits Scene: Karl Mordo strips Jonathan Pangborn of his magic, declaring there are 'too many sorcerers.'"
    ]
  },
  {
    id: "defenders-2017-wave",
    era: "civil-war-infinity",
    title: "Jessica Jones S2 / Luke Cage S2 / Iron Fist S2 / Daredevil S3 / Punisher S2 / Jessica Jones S3",
    type: "Show",
    inUniverseYear: "2017 - Early 2018",
    releaseYear: "2018 - 2019",
    doomsdayKey: false,
    summary: "The final pre-Blip street-level chapters: Matt Murdock defeats Dex (Bullseye) and puts Fisk back behind bars, while Trish Walker is sent to the Raft.",
    extras: [
      "Daredevil Season 3 Finale Stinger: Bullseye undergoes experimental spinal surgery with Dr. Oyama."
    ]
  },
  {
    id: "agents-of-shield-note",
    era: "civil-war-infinity",
    title: "Agents Of S.H.I.E.L.D. (Seasons 1 - 7) / Runaways / Cloak & Dagger",
    type: "Multiverse",
    inUniverseYear: "2013 - 2020 (Branch / Legacy Television)",
    releaseYear: "2013 - 2020",
    doomsdayKey: false,
    summary: "Phil Coulson's team battles HYDRA, Inhumans, LMD Aida, and travels through branched timelines via the Quantum Realm.",
    extras: [
      "Introduces the first iteration of the Darkhold and Quantum Realm timeline navigation."
    ]
  },
  {
    id: "thor-ragnarok",
    era: "civil-war-infinity",
    title: "Thor: Ragnarok",
    type: "Movie",
    inUniverseYear: "Late 2017 - 2018",
    releaseYear: "2017",
    doomsdayKey: true,
    summary: "Stranded on Sakaar with Hulk and Valkyrie, Thor must escape the Grandmaster and trigger Ragnarok to stop his sister Hela.",
    extras: [
      "Mid-Credits Scene: Thanos's massive warship, Sanctuary II, intercepts the Asgardian refugee vessel Statesman (leads directly into Infinity War).",
      "Post-Credits Scene: The overthrown Grandmaster confronts rebels on Sakaar."
    ]
  },
  {
    id: "ant-man-and-the-wasp",
    era: "civil-war-infinity",
    title: "Ant-Man And The Wasp",
    type: "Movie",
    inUniverseYear: "Spring 2018",
    releaseYear: "2018",
    doomsdayKey: true,
    summary: "Scott Lang and Hope van Dyne rescue Janet van Dyne from the Quantum Realm while contending with Ava Starr (Ghost).",
    extras: [
      "Mid-Credits Scene: While Scott harvests Quantum healing particles for Ghost, Hank, Janet, and Hope turn to dust during Thanos's Snap.",
      "Post-Credits Scene: A giant ant plays Scott's electronic drum kit while emergency broadcasts blare."
    ]
  },
  {
    id: "avengers-infinity-war",
    era: "civil-war-infinity",
    title: "Avengers: Infinity War",
    type: "Movie",
    inUniverseYear: "Spring 2018",
    releaseYear: "2018",
    doomsdayKey: true,
    summary: "The Avengers, Guardians of the Galaxy, Doctor Strange, and Wakanda fail to stop Thanos from assembling all six Infinity Stones and wiping out half of all life.",
    extras: [
      "Post-Credits Scene: Nick Fury and Maria Hill disintegrate in Atlanta, just as Fury activates a cosmic pager displaying the Captain Marvel insignia."
    ]
  },
  {
    id: "avengers-endgame",
    era: "civil-war-infinity",
    title: "Avengers: Endgame",
    type: "Movie",
    inUniverseYear: "2018 - October 2023",
    releaseYear: "2019",
    doomsdayKey: true,
    summary: "Five years after the Snap, the surviving Avengers execute a Time Heist through the Quantum Realm to restore the fallen, culminating in Tony Stark's sacrifice and Steve Rogers' retirement.",
    extras: [
      "No visual post-credits scene; features the sound of Tony Stark hammering his Mark I helmet at the end of the credits.",
      "Critical Doomsday Setup: The 2012 Time Heist creates the Loki Variant (Loki Series), and Steve Rogers' time travel in the 1940s directly triggers the events of Avengers: Doomsday."
    ]
  },

  // ERA 6: POST-BLIP & MULTIVERSE EXPANSION (2023 - 2025)
  {
    id: "wandavision",
    era: "post-blip",
    eraTitle: "Era 6: Post-Blip & The Multiverse Unleashed (2023 - 2025)",
    eraDesc: "The Sacred Timeline shatters as Wanda awakens as the Scarlet Witch and Sylvie slays He Who Remains, unleashing infinite Multiversal branches and Incursions.",
    title: "WandaVision (Limited Series)",
    type: "Show",
    inUniverseYear: "November 2023 (Climax Synced with Loki S1)",
    releaseYear: "2021",
    doomsdayKey: true,
    summary: "Grief-stricken Wanda Maximoff traps Westview, New Jersey in a sitcom Hex, battles Agatha Harkness, awakens as the Scarlet Witch, and creates twins Billy and Tommy.",
    extras: [
      "Episode 7, 8 & 9 Stingers: Monica Rambeau gains photon powers; S.W.O.R.D. activates White Vision; a Skrull invites Monica to space; Wanda astral-projects with the Darkhold and hears her sons crying across the Multiverse.",
      "<strong>Simultaneous Finale Synchronization (WandaVision &amp; Loki):</strong> The climaxes of <em>WandaVision</em> (Episode 9) and <em>Loki</em> (Season 1, Episode 6) line up second-for-second:<ul><li><strong>27:30–27:55:</strong> Wanda ascends into the Scarlet Witch at the exact time He Who Remains realizes he has crossed the threshold and can no longer predict the future.</li><li><strong>28:04:</strong> Thunder-like cosmic rumbling echoes in both scenes simultaneously.</li><li><strong>28:14:</strong> He Who Remains drops an object onto his desk at almost the exact moment Wanda drops Agatha Harkness to the ground.</li></ul>This popular Marvel synchronization theory suggests Wanda's reality-warping chaos magic transformation ruptured the Sacred Timeline, triggering the threshold breach outside time. <a href=\"https://www.youtube.com/results?search_query=WandaVision+and+Loki+synced+Did+Marvel+plan+this\" target=\"_blank\" rel=\"noopener noreferrer\" style=\"color: var(--accent); text-decoration: underline;\">Watch the synchronized scenes comparison on YouTube</a>."
    ]
  },
  {
    id: "loki-s1",
    era: "post-blip",
    title: "Loki (Season 1)",
    type: "Show",
    inUniverseYear: "Outside Time (Finale Synced with WandaVision)",
    releaseYear: "2021",
    doomsdayKey: true,
    summary: "Captured by the Time Variance Authority (TVA), 2012 Variant Loki and Mobius hunt Sylvie to the Citadel at the End of Time, where Sylvie kills He Who Remains and unleashes the Multiverse.",
    extras: [
      "Episode 4 Mid-Credits: Loki wakes up in the Void surrounded by Classic Loki, Kid Loki, Boastful Loki, and Alligator Loki.",
      "Finale Stinger: Stamps 'Loki will return in Season 2' on a TVA case file.",
      "<strong>Simultaneous Cosmic Threshold (WandaVision Sync):</strong> At timestamp 27:30–28:14 of Episode 6, He Who Remains realizes they crossed the threshold into unwritten time and drops his desk object at 28:14—synchronizing precisely with Wanda becoming the Scarlet Witch and dropping Agatha Harkness in <em>WandaVision</em>. This simultaneous event shatters the Sacred Timeline and opens the floodgates to the Multiverse."
    ]
  },
  {
    id: "loki-s2",
    era: "post-blip",
    title: "Loki (Season 2)",
    type: "Show",
    inUniverseYear: "Outside Time (TVA)",
    releaseYear: "2023",
    doomsdayKey: true,
    summary: "Time-slipping across past and future, Loki masters temporal manipulation, destroys the Temporal Loom, and takes his throne at the center of the Multiversal Yggdrasil tree.",
    extras: [
      "Essential Doomsday Pillar: Loki physically holds the branching timelines together at the End of Time, while the TVA transitions to monitoring Multiversal threats."
    ]
  },
  {
    id: "what-if-s1-s3",
    era: "post-blip",
    title: "What If...? (Seasons 1, 2 & 3) / Marvel Zombies",
    type: "Show",
    inUniverseYear: "Multiverse Branches",
    releaseYear: "2021 - 2025",
    doomsdayKey: false,
    summary: "Uatu the Watcher observes—and eventually intervenes in—divergent realities including Captain Carter, Strange Supreme, Kahhori, and a zombie-plagued Earth.",
    extras: [
      "Season 1 Finale Mid-Credits: Captain Carter discovers the HYDRA Stomper armor with someone inside on her Earth."
    ]
  },
  {
    id: "shang-chi",
    era: "post-blip",
    title: "Shang-Chi And The Legend Of The Ten Rings",
    type: "Movie",
    inUniverseYear: "April 2024",
    releaseYear: "2021",
    doomsdayKey: true,
    summary: "Shang-Chi confronts his father Xu Wenwu in the mystical realm of Ta Lo and inherits the cosmic Ten Rings.",
    extras: [
      "Mid-Credits Scene: Wong, Bruce Banner, and Carol Danvers examine the Ten Rings and discover they are transmitting a beacon into deep space/multiverse.",
      "Post-Credits Scene: Xialing takes over and modernizes the Ten Rings organization."
    ]
  },
  {
    id: "falcon-winter-soldier",
    era: "post-blip",
    title: "The Falcon And The Winter Soldier (Limited Series)",
    type: "Show",
    inUniverseYear: "Spring 2024",
    releaseYear: "2021",
    doomsdayKey: true,
    summary: "Sam Wilson and Bucky Barnes contend with the Flag Smashers, Isaiah Bradley's hidden history, and John Walker's volatile tenure before Sam claims the shield as Captain America.",
    extras: [
      "Episode 5 & 6 Stingers: Valentina recruits John Walker as U.S. Agent; pardoned Sharon Carter is revealed as the Power Broker with access to U.S. military secrets."
    ]
  },
  {
    id: "spiderman-far-from-home",
    era: "post-blip",
    title: "Spider-Man: Far From Home",
    type: "Movie",
    inUniverseYear: "Summer 2024",
    releaseYear: "2019",
    doomsdayKey: false,
    summary: "On a European school trip, Peter Parker is manipulated by Quentin Beck (Mysterio) into handing over Tony Stark's E.D.I.T.H. drone network.",
    extras: [
      "Includes 'Peter's To-Do List' short on home release.",
      "Mid-Credits Scene: Mysterio frames Spider-Man for his death and reveals Peter Parker's identity via J. Jonah Jameson's TheDailyBugle.net.",
      "Post-Credits Scene: Talos and Soren reveal they were impersonating Nick Fury and Maria Hill while the real Fury is aboard a SABER space station."
    ]
  },
  {
    id: "spiderman-no-way-home",
    era: "post-blip",
    title: "Spider-Man: No Way Home (+ The More Fun Stuff Cut)",
    type: "Movie",
    inUniverseYear: "Summer - December 2024",
    releaseYear: "2021",
    doomsdayKey: true,
    summary: "A botched memory spell by Doctor Strange pulls villains and two alternate Peter Parkers (Tobey Maguire & Andrew Garfield) across the Multiverse until Strange erases everyone's memory of Peter Parker.",
    extras: [
      "Mid-Credits Scene: Eddie Brock (Tom Hardy) and Venom are pulled back to Earth-688, leaving a drop of symbiote behind in Mexico.",
      "More Fun Stuff Extended Cut Post-Credits: Confirms the memory spell physically erased Peter's face from old Midtown High school broadcasts."
    ]
  },
  {
    id: "eternals",
    era: "post-blip",
    title: "Eternals",
    type: "Movie",
    inUniverseYear: "Fall 2024",
    releaseYear: "2021",
    doomsdayKey: false,
    summary: "Immortal beings created by the Celestial Arishem reunite to stop the Emergence of the Celestial Tiamut from destroying Earth, leaving a giant petrified marble Celestial in the Indian Ocean.",
    extras: [
      "Mid-Credits Scene: Eros (Starfox) and Pip the Troll teleport aboard the Domo to help find the abducted Eternals.",
      "Post-Credits Scene: Dane Whitman opens the Ebony Blade's case as the voice of Blade (Mahershala Ali) asks if he is ready."
    ]
  },
  {
    id: "multiverse-of-madness",
    era: "post-blip",
    title: "Doctor Strange In The Multiverse Of Madness",
    type: "Movie",
    inUniverseYear: "November 2024",
    releaseYear: "2022",
    doomsdayKey: true,
    summary: "Stephen Strange protects dimension-hopper America Chavez from the corrupted Scarlet Witch, colliding with Earth-838's Illuminati and causing an Incursion.",
    extras: [
      "Mid-Credits Scene: Strange develops a third eye before Clea (Charlize Theron) slashes open a portal to the Dark Dimension, recruiting him to stop an Incursion he caused.",
      "Post-Credits Scene: Pizza Poppa (Bruce Campbell) celebrates when Strange's self-punching spell wears off."
    ]
  },
  {
    id: "hawkeye",
    era: "post-blip",
    title: "Hawkeye (Limited Series)",
    type: "Show",
    inUniverseYear: "December 2024",
    releaseYear: "2021",
    doomsdayKey: false,
    summary: "Clint Barton teams up with archer Kate Bishop during Christmas in NYC to face the Tracksuit Mafia, Maya Lopez (Echo), Yelena Belova, and Wilson Fisk.",
    extras: [
      "Finale Post-Credits Scene: Full performance of 'Save the City' from Rogers: The Musical."
    ]
  },
  {
    id: "moon-knight",
    era: "post-blip",
    title: "Moon Knight (Limited Series)",
    type: "Show",
    inUniverseYear: "Spring 2025",
    releaseYear: "2022",
    doomsdayKey: false,
    summary: "Steven Grant and Marc Spector, avatars of the Egyptian moon god Khonshu, battle Arthur Harrow to prevent the resurrection of Ammit.",
    extras: [
      "Finale Mid-Credits Scene: Khonshu reveals a third alter, Jake Lockley, who executes Arthur Harrow in a limousine."
    ]
  },
  {
    id: "wakanda-forever",
    era: "post-blip",
    title: "Black Panther: Wakanda Forever",
    type: "Movie",
    inUniverseYear: "Spring 2025",
    releaseYear: "2022",
    doomsdayKey: true,
    summary: "Mourning King T'Challa, Shuri, Queen Ramonda, and Wakanda clash with Namor's underwater kingdom of Talokan while protecting young inventor Riri Williams.",
    extras: [
      "Mid-Credits Scene: Nakia introduces Shuri to T'Challa's young son, Prince T'oussaint (also named T'Challa), in Haiti."
    ]
  },
  {
    id: "echo",
    era: "post-blip",
    title: "Echo (Limited Series)",
    type: "Show",
    inUniverseYear: "May 2025",
    releaseYear: "2024",
    doomsdayKey: false,
    summary: "Maya Lopez returns to her hometown in Oklahoma, reconnects with her Choctaw ancestors, and confronts Wilson Fisk.",
    extras: [
      "Finale Mid-Credits Scene: On his private jet, Wilson Fisk watches a news debate about New York City's upcoming mayoral election (sets up Daredevil: Born Again)."
    ]
  },
  {
    id: "she-hulk",
    era: "post-blip",
    title: "She-Hulk: Attorney At Law (Season 1)",
    type: "Show",
    inUniverseYear: "2025",
    releaseYear: "2022",
    doomsdayKey: false,
    summary: "Jennifer Walters balances superhuman legal cases with Wong, Emil Blonsky, and Matt Murdock while breaking the fourth wall via K.E.V.I.N.",
    extras: [
      "Finale Scene: Bruce Banner returns from Sakaar with his son Skaar; Mid-Credits shows Wong breaking Emil Blonsky out of prison for Kamar-Taj."
    ]
  },
  {
    id: "ms-marvel",
    era: "post-blip",
    title: "Ms. Marvel (Limited Series)",
    type: "Show",
    inUniverseYear: "Fall 2025",
    releaseYear: "2022",
    doomsdayKey: true,
    summary: "Jersey City teen Kamala Khan unlocks cosmic hard-light powers via a Quantum Band bangle and discovers she has a mutant gene.",
    extras: [
      "Finale Post-Credits Scene: Kamala's bangle glows and she swaps places with Carol Danvers, who crashes into Kamala's bedroom (leads into The Marvels)."
    ]
  },
  {
    id: "thor-love-and-thunder",
    era: "post-blip",
    title: "Thor: Love And Thunder",
    type: "Movie",
    inUniverseYear: "Fall 2025",
    releaseYear: "2022",
    doomsdayKey: false,
    summary: "Thor teams up with Mighty Thor (Jane Foster), Valkyrie, and Korg to stop Gorr the God Butcher from reaching Eternity, eventually adopting Gorr's daughter Love.",
    extras: [
      "Mid-Credits Scene: A wounded Zeus orders his son Hercules (Brett Goldstein) to hunt down Thor.",
      "Post-Credits Scene: Jane Foster arrives at the gates of Valhalla and is welcomed by Heimdall."
    ]
  },
  {
    id: "ironheart",
    era: "post-blip",
    title: "Ironheart (Limited Series)",
    type: "Show",
    inUniverseYear: "Late 2025",
    releaseYear: "2025",
    doomsdayKey: false,
    summary: "Returning to Chicago after Wakanda Forever, Riri Williams builds her own advanced armor and collides with Parker Robbins (The Hood), where technology meets dark magic.",
    extras: [
      "Explores demonic magical pacts in the post-Blip street and tech underworld."
    ]
  },
  {
    id: "werewolf-by-night",
    era: "post-blip",
    title: "Werewolf By Night",
    type: "Special",
    inUniverseYear: "Late 2025",
    releaseYear: "2022",
    doomsdayKey: false,
    summary: "Monster hunter Jack Russell infiltrates the Bloodstone Temple alongside Elsa Bloodstone to rescue his friend Ted (Man-Thing).",
    extras: [
      "Marvel Studios Special Presentation available in both Black & White and Color versions."
    ]
  },
  {
    id: "gotg-holiday-special",
    era: "post-blip",
    title: "The Guardians Of The Galaxy Holiday Special",
    type: "Special",
    inUniverseYear: "December 2025",
    releaseYear: "2022",
    doomsdayKey: false,
    summary: "Mantis and Drax travel to Earth to abduct Kevin Bacon as a Christmas gift for Peter Quill, while Mantis reveals she is Peter's half-sister.",
    extras: [
      "Post-Credits Scene: Rocket and Cosmo decorate Groot like a Christmas tree until Groot drops his arms, prompting Rocket to quip they need another special."
    ]
  },

  // ERA 7: THE MULTIVERSE INCURSIONS & ROAD TO DOOMSDAY (2026 - 2028)
  {
    id: "quantumania",
    era: "road-to-doomsday",
    eraTitle: "Era 7: Incursions, New Teams & The Road To Doomsday (2026 - 2028)",
    eraDesc: "Multiversal tears widen across Earth-10005 and Earth-616, new Avengers and Thunderbolts rise, and Doctor Doom makes his move.",
    title: "Ant-Man And The Wasp: Quantumania",
    type: "Movie",
    inUniverseYear: "2026",
    releaseYear: "2023",
    doomsdayKey: true,
    summary: "Pulled into the Quantum Realm, the Lang and Pym families overthrow the exiled Kang the Conqueror.",
    extras: [
      "Mid-Credits Scene: The Council of Kangs gathers across the Multiverse.",
      "Post-Credits Scene: Loki and Mobius observe Victor Timely presenting temporal technology in 1893 (leads into Loki Season 2)."
    ]
  },
  {
    id: "guardians-vol-3",
    era: "road-to-doomsday",
    title: "Guardians Of The Galaxy Vol. 3",
    type: "Movie",
    inUniverseYear: "2026",
    releaseYear: "2023",
    doomsdayKey: false,
    summary: "The Guardians embark on a mission to save Rocket's life from his sadistic creator, the High Evolutionary, leading to the original team's retirement.",
    extras: [
      "Mid-Credits Scene: Captain Rocket leads the new Guardians roster (Adam Warlock, Phyla, Groot, Kraglin, Cosmo).",
      "Post-Credits Scene: Peter Quill eats cereal with his grandfather in Missouri; ends with 'The Legendary Star-Lord Will Return.'"
    ]
  },
  {
    id: "secret-invasion",
    era: "road-to-doomsday",
    title: "Secret Invasion (Limited Series)",
    type: "Show",
    inUniverseYear: "2026",
    releaseYear: "2023",
    doomsdayKey: false,
    summary: "Nick Fury returns to Earth to stop Gravik's rogue Skrull rebellion from sparking World War III and frees the abducted James 'Rhodey' Rhodes.",
    extras: [
      "Ends with President Ritson declaring war on all off-world species living on Earth before losing re-election to Thaddeus Ross."
    ]
  },
  {
    id: "the-marvels",
    era: "road-to-doomsday",
    title: "The Marvels",
    type: "Movie",
    inUniverseYear: "2026",
    releaseYear: "2023",
    doomsdayKey: true,
    summary: "Carol Danvers, Monica Rambeau, and Kamala Khan's powers become quantum-entangled as Dar-Benn rips jump-point holes in space-time, culminating in a tear between universes.",
    extras: [
      "Final Scene: Kamala Khan recruits Kate Bishop in New York for a Young Avengers / Champions team.",
      "Mid-Credits Scene (Crucial Doomsday Link): Monica Rambeau wakes up in an alternate X-Men universe alongside her mother Maria (Binary) and Dr. Hank McCoy / Beast (Kelsey Grammer)."
    ]
  },
  {
    id: "deadpool-and-wolverine",
    era: "road-to-doomsday",
    title: "Deadpool & Wolverine (Follows Deadpool 1, 2 & Logan)",
    type: "Movie",
    inUniverseYear: "2024 / 2026 / TVA Void",
    releaseYear: "2024",
    doomsdayKey: true,
    summary: "To save his dying timeline (Earth-10005) after the death of its 'Anchor Being' Logan, Wade Wilson teams up with a disgraced Wolverine variant to defeat Cassandra Nova in the Void.",
    extras: [
      "Introduces the Multiversal 'Anchor Being' rule and unites Fox Marvel icons (Gambit, X-23, Blade, Elektra, Johnny Storm).",
      "Post-Credits Scene: Wade plays TVA security footage proving Johnny Storm actually did insult Cassandra Nova."
    ]
  },
  {
    id: "agatha-all-along",
    era: "road-to-doomsday",
    title: "Agatha All Along (Limited Series)",
    type: "Show",
    inUniverseYear: "Late 2026",
    releaseYear: "2024",
    doomsdayKey: false,
    summary: "Freed from Wanda's spell in Westview, Agatha Harkness forms a coven with a mysterious teen—revealed to be the reincarnated Billy Maximoff (Wiccan)—to walk the Witches' Road.",
    extras: [
      "Finale: Spectral ghost Agatha sets off with Billy Maximoff to locate his reincarnated twin brother, Tommy Maximoff."
    ]
  },
  {
    id: "daredevil-born-again-s1",
    era: "road-to-doomsday",
    title: "Daredevil: Born Again (Season 1)",
    type: "Show",
    inUniverseYear: "Late 2026 - Early 2027",
    releaseYear: "2025",
    doomsdayKey: false,
    summary: "Following a devastating tragedy, Matt Murdock comes out of retirement as Daredevil when freshly elected NYC Mayor Wilson Fisk declares martial law against masked vigilantes.",
    extras: [
      "Post-Credits Scene: An imprisoned Frank Castle manipulates a guard to escape Mayor Fisk's Red Hook black-site."
    ]
  },
  {
    id: "cap-brave-new-world",
    era: "road-to-doomsday",
    title: "Captain America: Brave New World",
    type: "Movie",
    inUniverseYear: "Spring 2027",
    releaseYear: "2025",
    doomsdayKey: true,
    summary: "Sam Wilson and Joaquin Torres (Falcon) uncover Samuel Sterns' (The Leader) plot to turn President Thaddeus Ross into the Red Hulk over the global treaty for Celestial Island's Adamantium.",
    extras: [
      "Post-Credits Scene (Crucial Doomsday Warning): Imprisoned on the Raft, Samuel Sterns warns Sam Wilson that he has calculated probabilities of 'the Others' coming from alternate worlds in a coming multiversal clash."
    ]
  },
  {
    id: "thunderbolts",
    era: "road-to-doomsday",
    title: "Thunderbolts* (The New Avengers)",
    type: "Movie",
    inUniverseYear: "2027",
    releaseYear: "2025",
    doomsdayKey: true,
    summary: "Yelena Belova, Bucky Barnes, Red Guardian, Ghost, and U.S. Agent survive Valentina's death trap, save Bob Reynolds (The Sentry) from the Void, and are publicly unveiled as the New Avengers.",
    extras: [
      "Mid-Credits Scene: Red Guardian admires a Wheaties box in a grocery store.",
      "Post-Credits Scene (14-Month Time Jump into 2028 - Direct Doomsday Lead-In): While debating Sam Wilson's rival Avengers copyright, the New Avengers detect an extra-dimensional spacecraft bearing the Fantastic Four's '4' emblem entering Earth-616's orbit."
    ]
  },
  {
    id: "wonder-man",
    era: "road-to-doomsday",
    title: "Wonder Man (Limited Series)",
    type: "Show",
    inUniverseYear: "2027",
    releaseYear: "2026",
    doomsdayKey: false,
    summary: "Struggling actor Simon Williams hides his unstable ionic superpowers while auditioning for a superhero reboot alongside returning thespian Trevor Slattery and under the watch of Damage Control.",
    extras: [
      "Explores the " + "Doorman Clause" + " banning superpowered individuals from Hollywood sets."
    ]
  },
  {
    id: "daredevil-born-again-s2-punisher",
    era: "road-to-doomsday",
    title: "Daredevil: Born Again (Season 2) & The Punisher: One Last Kill",
    type: "Show",
    inUniverseYear: "2027",
    releaseYear: "2026",
    doomsdayKey: false,
    summary: "Matt Murdock rallies a street-level resistance including Jessica Jones to overthrow Mayor Fisk's Anti-Vigilante Task Force, while Frank Castle wages his own brutal war in his Special Presentation.",
    extras: [
      "Concludes the NYC martial law crisis ahead of Spider-Man: Brand New Day."
    ]
  },
  {
    id: "spiderman-brand-new-day",
    era: "road-to-doomsday",
    title: "Spider-Man: Brand New Day",
    type: "Movie",
    inUniverseYear: "2027 - 2028",
    releaseYear: "2026",
    doomsdayKey: true,
    summary: "Living anonymously as a solo hero in New York after Doctor Strange's spell, Peter Parker teams up with Frank Castle and Bruce Banner against rising street and superhuman threats.",
    extras: [
      "Post-Credits Scene bridges Peter Parker's isolation into the impending multiversal crisis of Avengers: Doomsday."
    ]
  },
  {
    id: "visionquest",
    era: "road-to-doomsday",
    title: "VisionQuest (Limited Series)",
    type: "Show",
    inUniverseYear: "2028",
    releaseYear: "2026",
    doomsdayKey: true,
    summary: "White Vision attempts to reconcile his restored memories and humanity while encountering reactivated A.I. constructs including Ultron, Friday, and Edith.",
    extras: [
      "Final Disney+ chapter before Avengers: Doomsday."
    ]
  },
  {
    id: "avengers-doomsday",
    era: "road-to-doomsday",
    title: "Avengers: Doomsday",
    type: "Movie",
    inUniverseYear: "2028 / Multiversal Convergence",
    releaseYear: "December 2026",
    doomsdayKey: true,
    isClimax: true,
    summary: "Doctor Victor Von Doom (Robert Downey Jr.) initiates a catastrophic multiversal reckoning, forcing Sam Wilson's Avengers, the New Avengers (Thunderbolts*), the Fantastic Four of Earth-828, Wakanda, and the original X-Men of Earth-10005 into a desperate battle for the survival of all realities.",
    extras: [
      "Direct sequel to the Infinity & Multiverse Sagas, leading directly into Avengers: Secret Wars."
    ]
  }
];

const STORAGE_KEY = "b_marvel_timeline_watched_v1";
let watchedIds = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
let activeEra = "all";
let activeType = "all";
let doomsdayOnly = false;
let hideExtras = false;
let searchQuery = "";
const collapsedEras = new Set();

const container = document.getElementById("timeline-container");
const searchInput = document.getElementById("tl-search");
const doomsdayBtn = document.getElementById("toggle-doomsday-only");
const extrasBtn = document.getElementById("toggle-extras-all");
const progressText = document.getElementById("progress-text");
const progressFill = document.getElementById("progress-fill");
const visibleCount = document.getElementById("visible-count");
const resetBtn = document.getElementById("reset-progress");
const topSpoilerNote = document.getElementById("top-spoiler-note");

function getBadgeClass(type) {
  switch (type) {
    case "Movie": return "badge-movie";
    case "Show": return "badge-show";
    case "One-Shot": return "badge-oneshot";
    case "Special": return "badge-special";
    case "Multiverse": return "badge-multiverse";
    default: return "badge-movie";
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...watchedIds]));
  updateProgressUI();
}

function updateProgressUI() {
  const total = TIMELINE_DATA.length;
  const done = watchedIds.size;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  progressText.textContent = `${done} / ${total} Completed (${pct}%)`;
  progressFill.style.width = `${pct}%`;
}

function renderTimeline() {
  if (topSpoilerNote) {
    topSpoilerNote.hidden = hideExtras;
    topSpoilerNote.style.display = hideExtras ? "none" : "";
  }

  container.innerHTML = "";
  let currentEraRendered = null;
  let currentEraEntries = null;
  let shown = 0;
  let matching = 0;

  TIMELINE_DATA.forEach((item, index) => {
    const matchesEra = activeEra === "all" || item.era === activeEra;
    const matchesType = activeType === "all" || item.type === activeType;
    const matchesDoomsday = !doomsdayOnly || item.doomsdayKey;
    const haystack = `${item.title} ${item.summary} ${item.inUniverseYear} ${item.releaseYear} ${(item.extras || []).join(" ")}`.toLowerCase();
    const matchesSearch = !searchQuery || haystack.includes(searchQuery);

    if (!matchesEra || !matchesType || !matchesDoomsday || !matchesSearch) {
      return;
    }

    matching++;

    // Render Era Divider when entering a new Era
    if (item.era !== currentEraRendered) {
      currentEraRendered = item.era;
      const eraSource = TIMELINE_DATA.find(e => e.era === item.era && e.eraTitle);
      if (eraSource) {
        const isCollapsible = activeEra === "all";
        const isCollapsed = isCollapsible && collapsedEras.has(item.era);
        const entriesId = `timeline-era-${item.era}`;
        const eraGroup = document.createElement("section");
        eraGroup.className = "era-group";

        const divider = document.createElement("div");
        divider.className = "era-divider";
        divider.innerHTML = isCollapsible
          ? `
              <h2>
                <button class="era-toggle" type="button" data-era="${item.era}"
                  aria-expanded="${!isCollapsed}" aria-controls="${entriesId}">
                  <span>${eraSource.eraTitle}</span>
                  <i class="fas ${isCollapsed ? "fa-chevron-down" : "fa-chevron-up"} era-toggle-icon" aria-hidden="true"></i>
                </button>
              </h2>
              <p>${eraSource.eraDesc}</p>
            `
          : `
              <h2>${eraSource.eraTitle}</h2>
              <p>${eraSource.eraDesc}</p>
            `;

        currentEraEntries = document.createElement("div");
        currentEraEntries.className = "era-entries";
        currentEraEntries.id = entriesId;
        currentEraEntries.hidden = isCollapsed;

        eraGroup.append(divider, currentEraEntries);
        container.appendChild(eraGroup);
      }
    }

    const isCollapsed = activeEra === "all" && collapsedEras.has(item.era);
    if (isCollapsed) {
      return;
    }
    shown++;

    const isWatched = watchedIds.has(item.id);
    const node = document.createElement("article");
    node.className = `panel-solid timeline-node ${item.doomsdayKey ? "doomsday-key" : ""} ${isWatched ? "watched" : ""} ${item.isClimax ? "doomsday-climax" : ""}`;

    const extrasHtml = (item.extras && item.extras.length && !hideExtras)
      ? `
            <div class="extras-box">
              <strong style="color: var(--accent);"><i class="fas fa-film" aria-hidden="true"></i> Extra Scenes, Post-Credits &amp; Tie-Ins:</strong>
              <ul>
                ${item.extras.map(ex => `<li>${ex}</li>`).join("")}
              </ul>
            </div>
          `
      : "";

    node.innerHTML = `
          <div class="panel-header node-header">
            <div class="node-title-wrap">
              <span class="node-index">#${String(index + 1).padStart(2, "0")}</span>
              <h3 class="node-title">${item.title}</h3>
              <span class="tl-badge ${getBadgeClass(item.type)}">${item.type}</span>
              ${item.doomsdayKey ? `<span class="tl-badge badge-doomsday"><i class="fas fa-bolt"></i> Doomsday Essential</span>` : ""}
            </div>
            <div class="node-meta">
              <span class="node-year"><i class="far fa-clock"></i> ${item.inUniverseYear} <span class="text-muted">(Rel: ${item.releaseYear})</span></span>
              <label class="watch-check">
                <input type="checkbox" data-id="${item.id}" ${isWatched ? "checked" : ""} />
                Watched
              </label>
            </div>
          </div>
          <div class="panel-body">
            <p style="margin: 0;">${item.summary}</p>
            ${extrasHtml}
          </div>
        `;

    (currentEraEntries || container).appendChild(node);
  });

  visibleCount.textContent = shown === matching
    ? `Showing ${shown} of ${TIMELINE_DATA.length} entries`
    : `Showing ${shown} of ${matching} matching entries (${TIMELINE_DATA.length} total)`;

  if (matching === 0) {
    container.innerHTML = `
          <div class="sub-panel" style="text-align: center; padding: 2rem;">
            <p style="margin: 0;">No timeline entries match your active filters. Try clearing your search or switching eras.</p>
          </div>
        `;
  }
}

// Event Listeners
container.addEventListener("click", (e) => {
  const toggle = e.target.closest(".era-toggle");
  if (!toggle) return;

  const era = toggle.getAttribute("data-era");
  if (collapsedEras.has(era)) {
    collapsedEras.delete(era);
  } else {
    collapsedEras.add(era);
  }
  renderTimeline();
});

container.addEventListener("change", (e) => {
  if (e.target.matches('input[type="checkbox"][data-id]')) {
    const id = e.target.getAttribute("data-id");
    if (e.target.checked) {
      watchedIds.add(id);
    } else {
      watchedIds.delete(id);
    }
    saveProgress();
    renderTimeline();
  }
});

searchInput.addEventListener("input", (e) => {
  searchQuery = e.target.value.trim().toLowerCase();
  renderTimeline();
});

doomsdayBtn.addEventListener("click", () => {
  doomsdayOnly = !doomsdayOnly;
  doomsdayBtn.classList.toggle("btn-success", doomsdayOnly);
  doomsdayBtn.classList.toggle("btn-outline-success", !doomsdayOnly);
  renderTimeline();
});

extrasBtn.addEventListener("click", () => {
  hideExtras = !hideExtras;
  extrasBtn.innerHTML = hideExtras
    ? `<i class="fas fa-eye-slash" aria-hidden="true"></i>Show Scene Spoilers`
    : `<i class="fas fa-eye" aria-hidden="true"></i>Toggle Scene Spoilers`;
  renderTimeline();
});

document.getElementById("era-tabs").addEventListener("click", (e) => {
  const btn = e.target.closest(".tab-btn");
  if (!btn) return;
  document.querySelectorAll("#era-tabs .tab-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  activeEra = btn.getAttribute("data-era");
  renderTimeline();
});

document.getElementById("type-filters").addEventListener("click", (e) => {
  const btn = e.target.closest(".navbox-btn");
  if (!btn) return;
  document.querySelectorAll("#type-filters .navbox-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  activeType = btn.getAttribute("data-type");
  renderTimeline();
});

resetBtn.addEventListener("click", () => {
  watchedIds.clear();
  saveProgress();
  renderTimeline();
});

// Initialize
updateProgressUI();
renderTimeline();