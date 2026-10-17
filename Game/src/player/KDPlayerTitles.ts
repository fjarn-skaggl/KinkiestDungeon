'use strict';

// Flag to globally disable titles, default to on, use localstorage value if available. 
let KDPlayerTitlesEnabled = localStorage.getItem("KDPlayerTitlesEnabled") ? localStorage.getItem("KDPlayerTitlesEnabled") : true
let KDUnlockedTitles = localStorage.getItem("KDPlayerTitlesUnlocked") ? JSON.parse(localStorage.getItem("KDPlayerTitlesUnlocked")) : ["None", "Auto"];

function PlayerTitleTick(force: boolean) {
    let update = false;
    // Find all titles we qualify for right now. 
    let currtitles = [];
    if (KDGameData.titlesUnlockedCache == undefined) { KDGameData.titlesUnlockedCache = {"None": 1, "Auto": 1}};
    Object.keys(KDPlayerTitles).forEach((title) => {
        if (KDGameData.titlesUnlockedCache[title]) {
            currtitles.push(title);
            return;
        }
        if (typeof KDPlayerTitles[title].unlockCondition === "function") {
            if ((force || KDPlayerTitles[title].rapid || KinkyDungeonCurrentTick % 10 == 0) && KDPlayerTitles[title].unlockCondition()) {
                currtitles.push(title);
            }
        }
    })

    // Determine the highest rarity auto title
    let autotitle = "None"
    let lastrarity = -100000
    currtitles.forEach((t) => {
        if (KDPlayerTitles[t]?.priority > lastrarity) {
            autotitle = t
        }
    })
    KDGameData.currentTitleAuto = autotitle;

    if (localStorage.getItem("KDPlayerTitlesUnlocked") == undefined) { localStorage.setItem("KDPlayerTitlesUnlocked", JSON.stringify([])) }

    currtitles.forEach((t) => {
        if ((t != "None") && (t != "Auto")) {
            if (!KDUnlockedTitles.includes(t)) {
                KDUnlockedTitles.push(t);
                KDSendMusicToast(TextGet("KDPlayerTitleUnlock") + TextGet(`KDPlayerTitle_${t}`));
                localStorage.setItem('KDPlayerTitlesUnlocked', JSON.stringify(KDUnlockedTitles))
            }
        }
    })

    // Add the current title, if it doesn't exist. 
    if (!currtitles.includes(KDGameData?.currentTitle) && (KDGameData?.currentTitle != undefined)) {
        currtitles.push(KDGameData.currentTitle)
    }

    // Find all titles that were available last turn 
    let oldtitles = KDGameData?.oldtitles ? KDGameData.oldtitles : [];

    // Combine these two title arrays into one map, using unique values.
    let combinedtitles = {}
    oldtitles.forEach((t) => {
        combinedtitles[t] = true;
    }) 
    currtitles.forEach((t) => {
        combinedtitles[t] = true;
    })

    // Now evaluate activating and dropping conditions
    Object.keys(combinedtitles).forEach((t) => {
        if ((t != "None") && (t != "Auto")) {
            if (oldtitles.includes(t) && !currtitles.includes(t)) {
                if (typeof KDPlayerTitles[t]?.titleDeactivate === "function") {
                    KDPlayerTitles[t].titleDeactivate()
                }
            }
            if (!oldtitles.includes(t) && currtitles.includes(t)) {
                if (typeof KDPlayerTitles[t]?.titleActivate === "function") {
                    KDPlayerTitles[t].titleActivate()
                }
            }
        }
    })

    // Now evaluate persistent functions
    currtitles.forEach((t) => {
        if ((t != "None") && (t != "Auto")) {
            if (typeof KDPlayerTitles[t]?.titleActive === "function") {
                KDPlayerTitles[t].titleActive()
            }
        }
    })

    KDGameData.oldtitles = currtitles;
    
    if (KDGameData.titlesUnlocked == undefined) { KDGameData.titlesUnlocked = ["None", "Auto"]}
    currtitles.forEach((t) => {
        if (!KDGameData.titlesUnlocked.includes(t)) {
            KDGameData.titlesUnlocked.push(t)
            KDGameData.titlesUnlockedCache[t] = 1;
        }
    })
    
    KDUnlockedTitles.forEach((t) => {
        if (!KDGameData.titlesUnlocked.includes(t)) {
            KDGameData.titlesUnlocked.push(t)
            KDGameData.titlesUnlockedCache[t] = 1;
        }
    })
}

let KDTitleTabCurrentTitle = "None";
let KDTitleTabCurrentDesc = "None";
let KDTitleTabCurrentIcon = "None";
let KDTitleTabCurrentTitleSelected = "None";
let KDTitleTabCurrentCategory = "Classes";
let KDTitleTabCurrentOffset = 0;
let KDTitleTabTitlesOffset = 0;

function KinkyDungeonDrawTitles() {
    let xOffset = -125;
    let x = 1300;
    if (KDToggles.SpellBook) {
        KDTextTan = KDTextTanSB;
        KDBookText = KDBookTextSB;
        KDDraw(kdcanvas, kdpixisprites, "magicbook", KinkyDungeonRootDirectory + "MagicBookNew.png", canvasOffsetX_ui - 100, canvasOffsetY_ui - 100, 640 * KinkyDungeonLoreScale, 520 * KinkyDungeonLoreScale);
    }
    else {
        KDTextTan = KDTextTanNew;
        KDBookText = KDBookTextNew;
        FillRectKD(kdcanvas, kdpixisprites, "magicbook", {
            Left: canvasOffsetX_ui,
            Top: canvasOffsetY_ui - 20,
            Width: 550 * KinkyDungeonLoreScale - 30,
            Height: 400 * KinkyDungeonLoreScale,
            Color: "#161920",
            LineWidth: 1,
            zIndex: -19,
            alpha: 1
        });
        DrawRectKD(kdcanvas, kdpixisprites, "magicbook2", {
            Left: canvasOffsetX_ui,
            Top: canvasOffsetY_ui - 20,
            Width: 550 * KinkyDungeonLoreScale - 30,
            Height: 400 * KinkyDungeonLoreScale,
            Color: KDBorderColor,
            LineWidth: 1,
            zIndex: -19,
            alpha: 0.9
        });
    }
    let loreName = ((KDTitleTabCurrentTitle != "None") && (KDTitleTabCurrentTitle != "???")) ? TextGet(`KDPlayerTitle_${KDTitleTabCurrentTitleSelected}`) : "Unknown"
    let loreOrig = ((KDTitleTabCurrentDesc != "None") ? TextGet(`KDPlayerTitleDesc_${KDTitleTabCurrentTitleSelected}`) : "").split(/\||\\n|\n/)
    let lore = [];
    let mult = KDGetFontMult();
    for (let str of loreOrig) {
        lore.push(...(KinkyDungeonWordWrap(str, 26 * mult, 60 * mult).split('\n')));
    }
    let i = 0; 
    DrawTextFitKD(loreName, 0.75 * 640 * KinkyDungeonLoreScale * 0.525
        + canvasOffsetX_ui - 100 + 640 * KinkyDungeonLoreScale / 8, canvasOffsetY_ui - 100 + 483 * KinkyDungeonLoreScale / 6 + i * 40, 0.75 * 640 * KinkyDungeonLoreScale, KDBookText, KDTextTan, 36, "center");
    if (KDLoreImg[KinkyDungeonCurrentLore]) {
        i += 0.7;
        let imgwidth = 200;
        let images = KDLoreImg[KinkyDungeonCurrentLore].split(/\||\\n|\n/);
        for (let ii = 0; ii < images.length; ii++) {
            KDDraw(kdcanvas, kdpixisprites, "kdlorimage" + ii, KinkyDungeonRootDirectory + images[ii], 0.75 * 640 * KinkyDungeonLoreScale * (0.525) + imgwidth * ii - (imgwidth / 2 * (images.length))
                + canvasOffsetX_ui - 100 + 640 * KinkyDungeonLoreScale / 8, canvasOffsetY_ui - 100 + 483 * KinkyDungeonLoreScale / 6 + i * 40, imgwidth, imgwidth, 0, undefined, undefined, undefined, undefined, true);
        }
    }
    i = 2;
    for (let N = 0; N < lore.length; N++) {
        DrawTextFitKD(lore[N], canvasOffsetX_ui - 100 + 640 * KinkyDungeonLoreScale / 8, canvasOffsetY_ui - 100 + 483 * KinkyDungeonLoreScale / 6 + i * 40, 0.75 * 640 * KinkyDungeonLoreScale, KDBookText, KDTextTan, 20, "left");
        i++;
    }
    let taboffset = 0;
    Object.keys(KDPlayerTitleCategories).forEach((category) => {
        // This checks if we've unlocked any title in that category.
        let tabtitletext = KDPlayerTitleCategories[category].some((t) => KDUnlockedTitles.includes(t)) ? TextGet(`KDPlayerTitleCategory_${category}`) : TextGet("KinkyDungeonCheckpointLoreUnknown")
        DrawButtonKDEx("loretab" + category, (_b) => {
            KDTitleTabTitlesOffset = 0
            KDTitleTabCurrentCategory = category
            return true;
        }, true, x + 300, 142 + taboffset * 42, 230, 40, tabtitletext, KDBaseWhite, undefined, undefined, undefined);
        taboffset++;
    })
    if (Object.keys(KDPlayerTitleCategories).includes(KDTitleTabCurrentCategory)) {
        if (KDTitleTabTitlesOffset > 0) {
            DrawButtonKDEx("TitleUp", (_b) => {
                KDTitleTabTitlesOffset = Math.max(KDTitleTabTitlesOffset - 16, 0); 
                return true;
            }, true, x + 100, 80, 90, 40, "", KDBaseWhite, KinkyDungeonRootDirectory + "Up.png");
        }
        if ((KDTitleTabTitlesOffset + 16) < KDPlayerTitleCategories[KDTitleTabCurrentCategory].length) {
            DrawButtonKDEx("TitleDown", (_b) => {
                KDTitleTabTitlesOffset = Math.max(Math.min(KDTitleTabTitlesOffset + 16, KDPlayerTitleCategories[KDTitleTabCurrentCategory].length - 16), 0);
                return true;
            }, true, x + 100, 860, 90, 40, "", KDBaseWhite, KinkyDungeonRootDirectory + "Down.png");
        }
        taboffset = 0;
        for(let ii = Math.max(KDTitleTabTitlesOffset, 0); ii < Math.min(Math.max(KDTitleTabTitlesOffset, 0) + 16, KDPlayerTitleCategories[KDTitleTabCurrentCategory].length); ii++) {
            let titletext = KDUnlockedTitles.includes(KDPlayerTitleCategories[KDTitleTabCurrentCategory][ii]) ? TextGet(`KDPlayerTitle_${KDPlayerTitleCategories[KDTitleTabCurrentCategory][ii]}`) : TextGet("KinkyDungeonCheckpointLoreUnknown")
            let titledesc = TextGet(`KDPlayerTitle_${KDPlayerTitleCategories[KDTitleTabCurrentCategory][ii]}`)
            let titlecolor = KDUnlockedTitles.includes(KDPlayerTitleCategories[KDTitleTabCurrentCategory][ii]) ? KDPlayerTitles[KDPlayerTitleCategories[KDTitleTabCurrentCategory][ii]].color : KDBaseWhite
            DrawButtonKDEx(`titleItem_${KDPlayerTitleCategories[KDTitleTabCurrentCategory][ii]}`, (_b) => {
                KDTitleTabCurrentTitleSelected = KDPlayerTitleCategories[KDTitleTabCurrentCategory][ii];
                KDTitleTabCurrentTitle = titletext;
                KDTitleTabCurrentDesc = titledesc;
                // I have no clue why this gives a ts error for a type "never"
                
                KDTitleTabCurrentIcon = (KDPlayerTitles[KDPlayerTitleCategories[KDTitleTabCurrentCategory][ii]]?.icon)
                    ? (KDPlayerTitles[KDPlayerTitleCategories[KDTitleTabCurrentCategory][ii]]?.icon) : "None";
                return true;
            }, true, x + 50, 142 + (taboffset) * 42, 250, 40, titletext, titlecolor, undefined);
            taboffset++;
        }
    }
    if (KDUnlockedTitles.includes(KDTitleTabCurrentTitleSelected)) {
        DrawButtonKDEx(`setTitle`, (_b) => {
            KDGameData.currentTitle = (KDTitleTabCurrentTitleSelected)
            return true;
        }, true, x - 600, 650, 400, 80, (KDTitleTabCurrentTitleSelected == KDGameData.currentTitle) ? "Activated" : "Set Title", (KDTitleTabCurrentTitleSelected == KDGameData.currentTitle) ? "#aaaaaa" : "#ffffff", undefined, undefined, (KDTitleTabCurrentTitleSelected == KDGameData.currentTitle)); 
    }
    KDDrawLoreRepTabs(xOffset);
}

function KDPlayerTitlesRefreshCategories() {
    let categoriesobject = {}
    Object.keys(KDPlayerTitles).forEach((t) => {
        if (categoriesobject[KDPlayerTitles[t].category] == undefined) {
            categoriesobject[KDPlayerTitles[t].category] = [];
        }
        categoriesobject[KDPlayerTitles[t].category].push(t)
    })
    KDPlayerTitleCategories = categoriesobject
}

const KDPlayerTitleDefaults = {
    titleActive: () => false,
    titleActivate: () => false,
    titleDeactivate: () => false,
    icon: "None",
};

let KDPlayerTitles: Record<string, KDPlayerTitle> = {
    // ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // Class Titles
    // ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // Player is playing as the wizard class
    "ClassMage": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            return (KDGameData?.Class == "Mage")
        },
        "priority": -100,
        "color": "#406dce",
        "category": "Classes",
    },
    // Player is playing as the warrior class.
    "ClassFighter": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            return (KDGameData?.Class == "Fighter")
        },
        "priority": -100,
        "color": "#f51212",
        "category": "Classes",
    },
    // Player is playing as the rogue class
    "ClassRogue": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            return (KDGameData?.Class == "Rogue")
        },
        "priority": -100,
        "color": "#12ff0a",
        "category": "Classes",
    },
    // Player is playing as the trainee class
    "ClassTrainee": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            return (KDGameData?.Class == "Trainee")
        },
        "priority": -100,
        "color": "#ffa0d7",
        "category": "Classes",
    },
    // Player is playing as the peasant class
    "ClassPeasant": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            return (KDGameData?.Class == "Peasant")
        },
        "priority": -100,
        "color": "#ffffff",
        "category": "Classes",
    },

    // ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // Stat titles 
    // ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // Player has run their SP down to 0.
    "Exhausted": {
        ...KDPlayerTitleDefaults,
        rapid: true,
        "unlockCondition": () => {
            return (KinkyDungeonStatStamina <= 0.0)
        },
        "priority": 0,
        "color": "#22aa22",
        "category": "Stats",
    },
    // Player is at 95% desire (not distraction, desire)
    "Distracted": {
        ...KDPlayerTitleDefaults,
        rapid: true,
        "unlockCondition": () => {
            return (KinkyDungeonStatDistractionLower >= (KinkyDungeonStatDistractionMax * 0.95))
        },
        "priority": 3,
        "color": "#e977cc",
        "category": "Stats",
    },
    // Player has exhausted their mana pool and has less than 15 mana remaining.
    "OutOfMana": {
        ...KDPlayerTitleDefaults,
        rapid: true,
        "unlockCondition": () => {
            return ((KinkyDungeonStatManaPool <= 0) && (KinkyDungeonStatMana <= 1.5))
        },
        "priority": 10,
        "color": "#0052eb",
        "category": "Stats",
    },
    // Player has run out of willpower
    "OutofWillpower": {
        ...KDPlayerTitleDefaults,
        rapid: true,
        "unlockCondition": () => {
            return (KinkyDungeonStatWill <= 0)
        },
        "priority": 1,
        "color": "#7a0000",
        "category": "Stats",
    },
    // Player has 0 WP, 0 SP and 0 MP at the same time. 
    "OutofEverything": {
        ...KDPlayerTitleDefaults,
        rapid: true,
        "unlockCondition": () => {
            return ((KinkyDungeonStatWill <= 0) && (KinkyDungeonStatMana <= 0) && (KinkyDungeonStatStamina <= 0))
        },
        "priority": 1,
        "color": "#ffffff",
        "category": "Stats",
    },
    "JuicedUp": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            return (KinkyDungeonStatStaminaMax >= 40)
        },
        "priority": 1,
        "color": "#00ff37",
        "category": "Stats",
    },
    "Manafused": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            return (KinkyDungeonStatManaMax >= 40)
        },
        "priority": 1,
        "color": "#5762ff",
        "category": "Stats",
    },
    "Unbreakable": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            return (KinkyDungeonStatWillMax >= 40)
        },
        "priority": 1,
        "color": "#ff0e0e",
        "category": "Stats",
    },
    "Unwavering": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            return (KinkyDungeonStatDistractionMax >= 40)
        },
        "priority": 1,
        "color": "#ff3dbe",
        "category": "Stats",
    },


    // ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // Game/Map Condition Titles
    // ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // Player has opened a chest on this floor
    "TreasureSeeker": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            return (KDGameData?.AlreadyOpened.length > 0)
        },
        "priority": 2,
        "color": "#fa7305",
        "category": "Game",
    },
    // Player has been put in jail
    "Jailed": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            return (KDGameData?.PrisonerState == "Jail")
        },
        "priority": 11,
        "color": "#fa7305",
        "category": "Game",
    },
    // Player has been leashed
    "Leashed": {
        ...KDPlayerTitleDefaults,
        rapid: true,
        "unlockCondition": () => {
            return (KDGameData?.KinkyDungeonLeashedPlayer >= 1)
        },
        "priority": 7,
        "color": "#a5ff8f",
        "category": "Game",
    },
    // Player is off balance
    "Offbalance": {
        ...KDPlayerTitleDefaults,
        rapid: true,
        "unlockCondition": () => {
            return (KDGameData?.Balance <= 0.5)
        },
        "priority": 5,
        "color": "#aa96ff",
        "category": "Game",
    },
    // Player summoned an angel
    "AngelSummoned": {
        ...KDPlayerTitleDefaults,
        rapid: true,
        "unlockCondition": () => {
            return (KDGameData?.RescueFlag)
        },
        "priority": 3,
        "color": "#ffd900",
        "category": "Game",
    },
    // Player finds an Angel
    "AngelFound": {
        ...KDPlayerTitleDefaults,
        rapid: true,
        "unlockCondition": () => {
            return (KDNearbyEnemies(KinkyDungeonPlayerEntity.x, KinkyDungeonPlayerEntity.y,2).map((t) => t.Enemy?.name).includes("Angel"))
        },
        "priority": 3,
        "color": "#ffffff",
        "category": "Game",
    },
    // Player has been recruited
    "Recruited": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            return (KinkyDungeonFlags.get(`Recruited`) != undefined)
        },
        "priority": 3,
        "color": "#ffffff",
        "category": "Game",
    },
    // Player accepts a bondage offer
    "Submissive": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            
            return (KDGameData?.titledata?.sub)
        },
        "priority": 3,
        "color": "#ffffff",
        "category": "Game",
    },
    // Player convinces an NPC to wear their bondage offer
    "Dominant": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            
            return (KDGameData?.titledata?.dom)
        },
        "priority": 3,
        "color": "#ffffff",
        "category": "Game",
    },
    // Player accepts a bondage offer and convinces another bondage offer to wear their requested restraint
    "Switch": { 
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            
            return ((KDGameData?.titledata?.sub) && (KDGameData?.titledata?.dom))
        },
        "priority": 3,
        "color": "#ffffff",
        "category": "Game",
    },
    "Moth": { 
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            
            return (KDGameData?.titledata?.lampstolen)
        },
        "priority": 3,
        "color": "#ffffff",
        "category": "Game",
    },

    // ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // Inventory Worn Titles
    // ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // Player is wearing chastity belt and chastity bra
    "Chaste": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            return (KinkyDungeonIsChaste(undefined) && KinkyDungeonIsChaste(true))
        },
        "priority": 4,
        "color": "#f2efff",
        "category": "Inventory",
    },
    "Hoarder": {
        ...KDPlayerTitleDefaults,
        rapid: true,
        "unlockCondition": () => {
            return ((KinkyDungeonInventory.get("looserestraint").size + KinkyDungeonInventory.get("consumable").size + KinkyDungeonInventory.get("weapon").size) > 300)
        },
        "priority": 3,
        "color": "#f2efff",
        "category": "Inventory",
    },
    "LootGoblin": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            return ((KinkyDungeonInventory.get("looserestraint").size + KinkyDungeonInventory.get("consumable").size + KinkyDungeonInventory.get("weapon").size) > 1000)
        },
        "priority": 3,
        "color": "#f2efff",
        "category": "Inventory",
    },
    "InfinitePockets": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            return ((KinkyDungeonInventory.get("looserestraint").size + KinkyDungeonInventory.get("consumable").size + KinkyDungeonInventory.get("weapon").size) > 3000)
        },
        "priority": 3,
        "color": "#f2efff",
        "category": "Inventory",
    },
    "Bound": {
        ...KDPlayerTitleDefaults,
        rapid: true,
        "unlockCondition": () => {
            return (KDGameData?.Restriction > 20)
        },
        "priority": 4,
        "color": "#f2efff",
        "category": "Inventory",
    },
    "Helpless": {
        ...KDPlayerTitleDefaults,
        rapid: true,
        "unlockCondition": () => {
            return (KDGameData?.Restriction > 45)
        },
        "priority": 4,
        "color": "#f2efff",
        "category": "Inventory",
    },
    "Blind": {
        ...KDPlayerTitleDefaults,
        rapid: true,
        "unlockCondition": () => {
            return (KinkyDungeonBlindLevel > 0)
        },
        "priority": 4,
        "color": "#37638b",
        "category": "Inventory",
    },
    // Player is fully slimed and then it hardens.
    "EncasedAdventurer": {
        ...KDPlayerTitleDefaults,
        rapid: true,
        "unlockCondition": () => { 
            let restraints = ['HardSlimeHands', 'HardSlimeBoots', 'HardSlimeMouth', 'HardSlimeArms', 'HardSlimeFeet', 'HardSlimeLegs', 'HardSlimeHead']
            let allworn = true;
            restraints.forEach((r) => {
                if (!KinkyDungeonInventory.get("restraint").has(r)) {
                    allworn = false;
                }
            })
            return (allworn)
        },
        "priority": 4,
        "color": "#9f00b4",
        "category": "Inventory",
    },
    // Player wears any Ancient restraint.
    "NoLocks": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => { 
            let restraints = ["EnchantedBelt", "EnchantedBra", "EnchantedHeels", "EnchantedBlindfold", "EnchantedAnkleCuffs", "EnchantedAnkleCuffs2", "EnchantedMuzzle", "EnchantedBallGag", "EnchantedArmbinder", "EnchantedMittens"]
            let worn = false;
            restraints.forEach((r) => {
                if (KinkyDungeonInventory.get("restraint").has(r)) {
                    worn = true;
                }
            })
            return (worn)
        },
        "priority": 4,
        "color": "#ffffff",
        "category": "Inventory",
    },
    // Player wears any cursed restraint or armor.
    "Cursed": {
        ...KDPlayerTitleDefaults,
        rapid: true,
        "unlockCondition": () => { 
            return (Array.from(KinkyDungeonInventory.get("restraint").values()).some((t) => {
                return t.curse != undefined
            }))
        },
        "priority": 4,
        "color": "#ffffff",
        "category": "Inventory",
    },


    // ---------------------------------------------------------------------------------------------
    // Boss Titles
    // ---------------------------------------------------------------------------------------------
    "FuukaRestGood": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            return (KinkyDungeonInventoryGet("MikoCollar2")?.name != undefined)
        },
        "priority": 2,
        "color": "#faaeb2",
        "category": "Boss",
    },
    "FuukaRestBad": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            return (KinkyDungeonInventoryGet("MikoCollar")?.name != undefined)
        },
        "priority": 2,
        "color": "#ff9196",
        "category": "Boss",
    },
    "WardenRestGood": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            return (KinkyDungeonInventoryGet("WardenBelt2")?.name != undefined)
        },
        "priority": 2,
        "color": "#9cfff2",
        "category": "Boss",
    },
    "WardenRestBad": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            return (KinkyDungeonInventoryGet("WardenBelt")?.name != undefined)
        },
        "priority": 2,
        "color": "#ffc392",
        "category": "Boss",
    },
    "DollmakerVisor": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            return (KinkyDungeonInventoryGet("DollmakerVisor")?.name != undefined)
        },
        "priority": 2,
        "color": "#ff88ca",
        "category": "Boss",
    },
    "DollmakerMask": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            return (KinkyDungeonInventoryGet("DollmakerMask")?.name != undefined)
        },
        "priority": 2,
        "color": "#ff89c4",
        "category": "Boss",
    },

    // ---------------------------
    // Spell Point Mastery
    // ---------------------------
    "SpellMasteryFlame": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            let reqspells = KDUpdateSpellMasteryReqs("ApprenticeFire")
            return (reqspells.every((sp) => KinkyDungeonSpells.map((t) => t.name).includes(sp))) // Checks if we have every single spell above
        },
        "priority": 2,
        "color": "#ff0707",
        // Run when the player deselects this title or it falls off of auto. 
        "category": "Spells",
    },
    "SpellMasteryWater": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            let reqspells = KDUpdateSpellMasteryReqs("ApprenticeWater")
            return (reqspells.every((sp) => KinkyDungeonSpells.map((t) => t.name).includes(sp))) // Checks if we have every single spell above
        },
        "priority": 2,
        "color": "#4032ff",
        "category": "Spells",
    },
    "SpellMasteryEarth": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            let reqspells = KDUpdateSpellMasteryReqs("ApprenticeEarth")
            return (reqspells.every((sp) => KinkyDungeonSpells.map((t) => t.name).includes(sp))) // Checks if we have every single spell above
        },
        "priority": 2,
        "color": "#7c5c42",
        "category": "Spells",
    },
    "SpellMasteryAir": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            let reqspells = KDUpdateSpellMasteryReqs("ApprenticeAir") // Is there seriously only two spells for air? 
            return (reqspells.every((sp) => KinkyDungeonSpells.map((t) => t.name).includes(sp))) // Checks if we have every single spell above
        },
        "priority": 2,
        "color": "#ffffff",
        "category": "Spells",
    },
    "SpellMasteryLightning": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            let reqspells = KDUpdateSpellMasteryReqs("ApprenticeLightning")
            return (reqspells.every((sp) => KinkyDungeonSpells.map((t) => t.name).includes(sp))) // Checks if we have every single spell above
        },
        "priority": 2,
        "color": "#ffee00",
        "category": "Spells",
    },
    "SpellMasteryIce": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            let reqspells = KDUpdateSpellMasteryReqs("ApprenticeIce")
            return (reqspells.every((sp) => KinkyDungeonSpells.map((t) => t.name).includes(sp))) // Checks if we have every single spell above
        },
        "priority": 2,
        "color": "#00f7ff",
        "category": "Spells",
    },
    "SpellMasteryRope": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            let reqspells = KDUpdateSpellMasteryReqs("ApprenticeRope")
            return (reqspells.every((sp) => KinkyDungeonSpells.map((t) => t.name).includes(sp))) // Checks if we have every single spell above
        },
        "priority": 2,
        "color": "#dfb26f",
        "category": "Spells",
    },
    "SpellMasteryMetal": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            let reqspells = KDUpdateSpellMasteryReqs("ApprenticeMetal")
            return (reqspells.every((sp) => KinkyDungeonSpells.map((t) => t.name).includes(sp))) // Checks if we have every single spell above
        },
        "priority": 2,
        "color": "#acacac",
        "category": "Spells",
    },
    "SpellMasteryLeather": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            let reqspells = KDUpdateSpellMasteryReqs("ApprenticeLeather")
            return (reqspells.every((sp) => KinkyDungeonSpells.map((t) => t.name).includes(sp))) // Checks if we have every single spell above
        },
        "priority": 2,
        "color": "#414141",
        "category": "Spells",
    },
    "SpellMasterySummon": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            let reqspells = KDUpdateSpellMasteryReqs("ApprenticeSummon")
            return (reqspells.every((sp) => KinkyDungeonSpells.map((t) => t.name).includes(sp))) // Checks if we have every single spell above
        },
        "priority": 2,
        "color": "#e6fde5",
        "category": "Spells",
    },
    "SpellMasteryLatex": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            let reqspells = KDUpdateSpellMasteryReqs("ApprenticeLatex")
            return (reqspells.every((sp) => KinkyDungeonSpells.map((t) => t.name).includes(sp))) // Checks if we have every single spell above
        },
        "priority": 2,
        "color": "#993ccf",
        "category": "Spells",
    },
    "SpellMasteryPhysics": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            let reqspells = KDUpdateSpellMasteryReqs("ApprenticePhysics")
            return (reqspells.every((sp) => KinkyDungeonSpells.map((t) => t.name).includes(sp))) // Checks if we have every single spell above
        },
        "priority": 2,
        "color": "#72eb9a",
        "category": "Spells",
    },
    "SpellMasteryShadow": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            let reqspells = KDUpdateSpellMasteryReqs("ApprenticeShadow")
            return (reqspells.every((sp) => KinkyDungeonSpells.map((t) => t.name).includes(sp))) // Checks if we have every single spell above
        },
        "priority": 2,
        "color": "#1e1d58",
        "category": "Spells",
    },
    "SpellMasteryLight": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            let reqspells = KDUpdateSpellMasteryReqs("ApprenticeLight")
            return (reqspells.every((sp) => KinkyDungeonSpells.map((t) => t.name).includes(sp))) // Checks if we have every single spell above
        },
        "priority": 2,
        "color": "#ffedc5",
        "category": "Spells",
    },
    "SpellMasteryObscurity": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            let reqspells = KDUpdateSpellMasteryReqs("ApprenticeMystery")
            return (reqspells.every((sp) => KinkyDungeonSpells.map((t) => t.name).includes(sp))) // Checks if we have every single spell above
        },
        "priority": 2,
        "color": "#b8b8b8",
        "category": "Spells",
    },
    "SpellMasteryProjection": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            let reqspells = KDUpdateSpellMasteryReqs("ApprenticeProjection") // Yeah theres apparently only one spell. 
            return (reqspells.every((sp) => KinkyDungeonSpells.map((t) => t.name).includes(sp))) // Checks if we have every single spell above
        },
        "priority": 2,
        "color": "#a1a1a1",
        "category": "Spells",
    },
    "SpellMasteryKnowledge": { 
        ...KDPlayerTitleDefaults,
        // Run to unlock and attempt to auto apply title. 
        "unlockCondition": () => {
            let reqspells = KDUpdateSpellMasteryReqs("ApprenticeKnowledge")
            return (reqspells.every((sp) => KinkyDungeonSpells.map((t) => t.name).includes(sp))) // Checks if we have every single spell above
        },
        "priority": 2,
        "color": "#d35d5d",
        "category": "Spells",
    },
    // -----------------------------------------------------------------------------------------
    // Recruited by Faction
    // -----------------------------------------------------------------------------------------
    "Bountyhunter": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            return (KinkyDungeonFlags.get(`Recruit_OfferBountyhunter`) != undefined)
        },
        "priority": 8,
        "color": KDBaseForest,
        "category": "Faction",
    },
    "Bandit": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            return (KinkyDungeonFlags.get(`Recruit_OfferBandit`) != undefined)
        },
        "priority": 8,
        "color": KDBaseOrange,
        "category": "Faction",
    },
    "Alchemist": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            return (KinkyDungeonFlags.get(`Recruit_OfferAlchemist`) != undefined)
        },
        "priority": 8,
        "color": KDBaseCyan,
        "category": "Faction",
    },
    "Nevermere": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            return (KinkyDungeonFlags.get(`Recruit_OfferWolfgirl`) != undefined)
        },
        "priority": 8,
        "color": KDBaseTeal,
        "category": "Faction",
    },
    "Apprentice": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            return (KinkyDungeonFlags.get(`Recruit_OfferApprentice`) != undefined)
        },
        "priority": 8,
        "color": KDBaseLightBlue,
        "category": "Faction",
    },
    "Dressmaker": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            return (KinkyDungeonFlags.get(`Recruit_OfferDressmaker`) != undefined)
        },
        "priority": 8,
        "color": KDBaseRibbon,
        "category": "Faction",
    },
    /*
    "Witch": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            return (KinkyDungeonFlags.get(`Recruit_OfferWitch`) != undefined)
        },
        "priority": 8,
        "color": KDBasePurple,
        "category": "Faction",
    },
    */
    "Elemental": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            return (KinkyDungeonFlags.get(`Recruit_OfferElemental`) != undefined)
        },
        "priority": 8,
        "color": KDBaseRed,
        "category": "Faction",
    },
    "Dragon": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            return (KinkyDungeonFlags.get(`Recruit_OfferDragonheart`) != undefined)
        },
        "priority": 8,
        "color": "#b9451d",
        "category": "Faction",
    },
    "Maidforce": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            return (KinkyDungeonFlags.get(`Recruit_OfferMaid`) != undefined)
        },
        "priority": 8,
        "color": KDBaseWhite,
        "category": "Faction",
    },
    "Bast": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            return (KinkyDungeonFlags.get(`Recruit_OfferBast`) != undefined)
        },
        "priority": 8,
        "color": KDBaseYellowGreen,
        "category": "Faction",
    },
    "Elf": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            return (KinkyDungeonFlags.get(`Recruit_OfferElf`) != undefined)
        },
        "priority": 8,
        "color": KDBaseMint,
        "category": "Faction",
    },
    "AncientRobot": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            return (KinkyDungeonFlags.get(`Recruit_OfferAncientRobot`) != undefined)
        },
        "priority": 8,
        "color": "#888888",
        "category": "Faction",
    },
    // ---------------------------------------------------------------------------------------------
    // Goddess Reputation Achievements
    // ---------------------------------------------------------------------------------------------
    "Conjure": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            return (KinkyDungeonGoddessRep["Conjure"] >= 50)
        },
        "priority": 8,
        "color": KDRepNameColor["Conjure"],
        "category": "Reputation",
    },
    "Elements": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            return (KinkyDungeonGoddessRep["Elements"] >= 50)
        },
        "priority": 8,
        "color": KDRepNameColor["Elements"],
        "category": "Reputation",
    },
    "Illusion": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            return (KinkyDungeonGoddessRep["Illusion"] >= 50)
        },
        "priority": 8,
        "color": KDRepNameColor["Illusion"],
        "category": "Reputation",
    },
    "Latex": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            return (KinkyDungeonGoddessRep["Latex"] >= 50)
        },
        "priority": 8,
        "color": KDRepNameColor["Latex"],
        "category": "Reputation",
    },
    "Leather": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            return (KinkyDungeonGoddessRep["Leather"] >= 50)
        },
        "priority": 8,
        "color": KDRepNameColor["Leather"],
        "category": "Reputation",
    },
    "Metal": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            return (KinkyDungeonGoddessRep["Metal"] >= 50)
        },
        "priority": 8,
        "color": KDRepNameColor["Metal"],
        "category": "Reputation",
    },
    "Rope": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            return (KinkyDungeonGoddessRep["Rope"] >= 50)
        },
        "priority": 8,
        "color": KDRepNameColor["Rope"],
        "category": "Reputation",
    },
    "Will": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            return (KinkyDungeonGoddessRep["Will"] >= 50)
        },
        "priority": 8,
        "color": KDRepNameColor["Will"],
        "category": "Reputation",
    },

    // -------------------------------------
    // Mastery Achievements - These will take a combination of achievements or a significant amount of time to unlock
    // -------------------------------------
    // Player has all of the spells unlocked.
    "Mastery_Archmage": { 
        ...KDPlayerTitleDefaults,
        // Run to unlock and attempt to auto apply title. 
        "unlockCondition": () => {
            let req = ["SpellMasteryFlame", "SpellMasteryAir", "SpellMasteryLightning", "SpellMasteryWater", "SpellMasteryEarth", "SpellMasteryRope", "SpellMasteryLeather", "SpellMasteryMetal", "SpellMasteryLatex", "SpellMasteryPhysics", "SpellMasteryShadow", "SpellMasteryLight", "SpellMasteryObscurity", "SpellMasteryProjection", "SpellMasteryKnowledge", "SpellMasterySummon"]
            
            return (req.every((sp) => KDGameData?.oldtitles?.includes(sp))) // Checks if we have every single title active above
        },
        "priority": 2,
        "color": "#00ffff",
        "category": "Mastery",
    },
    // Player enters NG+25
    "Mastery_EWhac": { 
        ...KDPlayerTitleDefaults,
        // Run to unlock and attempt to auto apply title. 
        "unlockCondition": () => {
            return (KinkyDungeonNewGame >= 25) // Check if we entered NG+25
        },
        "priority": 2, 
        // Color for the title - defaults to #ffffff 
        "color": "#fa3030", 
        // Run every turn while active
        // Category in the Titles Tab
        "category": "Mastery",
    },
    "Mastery_MossBoss": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => {
            return ((KinkyDungeonStatDistractionMax >= 40) && (KinkyDungeonStatWillMax >= 40) && (KinkyDungeonStatManaMax >= 40) && (KinkyDungeonStatStaminaMax >= 40))
        },
        "priority": 1,
        "color": "#74f39f", 
        "category": "Mastery",
    },
    // Player wears every Ancient restraint.
    "Mastery_AncientAdventurer": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => { 
            let restraints = ["EnchantedBelt", "EnchantedBra", "EnchantedHeels", "EnchantedBlindfold", "EnchantedAnkleCuffs", "EnchantedMuzzle", "EnchantedBallGag", "EnchantedArmbinder", "EnchantedMittens"]
            let worn = true;
            restraints.forEach((r) => {
                if (r == "EnchantedBallGag") {
                    if ((!KinkyDungeonInventory.get("restraint").has("EnchantedMuzzle")) || (KinkyDungeonInventoryGetWorn("EnchantedBallGag") == undefined)) {
                        worn = false;
                    }
                }
                else if (!KinkyDungeonInventory.get("restraint").has(r)) {
                    worn = false;
                }
            })
            return (worn)
        },
        "priority": 12,
        "color": "#ffca57",
        "category": "Mastery",
    },
    // Player enters edged
    "LostInSpace": {
        ...KDPlayerTitleDefaults,
        "unlockCondition": () => { 
            
            return KDMapData?.RoomType == "DemonTransition";
        },
        "priority": 12,
        "color": "#883afd",
        "category": "Exploration",
    },
}

let KDPlayerTitleCategories: Record<string, string[]> = {}
KDPlayerTitlesRefreshCategories();