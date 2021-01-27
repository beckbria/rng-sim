class CardHandlerUnit {
    constructor(name, prefix, dealCallback, initialInputQueue = []) {
        // The name displayed above this CHU
        this.name = name;
        // The unique prefix prepended to all HTML elements created by this CHU
        this.prefix = prefix;
        // The raw instructions held by this unit
        this.rawInst = [""];
        // The parsed instructions held by this unit
        this.inst = [];
        // Any labels and the line they correspond to.  Note that the line corresponds to the next
        // instruction after the label, NOT the position of the label itself
        this.labels = new Map();
        // Program counter tracking what instruction will next be executed.  Indexes into inst
        this.currentLine = 0;
        // Whether this node is currently allowing its source code to be edited
        this.editMode = true;
        // The card currently held by this CHU
        this.card = "";
        // General-purpose registers
        // TODO: Consider changing this to a map
        this.reg = [0,0,0];
        // The cards currently available in the input queue
        this.inputQueue = [...initialInputQueue];
        // A copy of the initial contents for reset purposes
        this.initialInputQueue = [...initialInputQueue];
        // Callback that takes a card when it is dealt
        this.dealCallback = dealCallback;
        // Callbacks that take a card function and add it to the input queue in that direction
        this.up = null;
        this.down = null;
        this.left = null;
        this.right = null;
    }

    // div IDs for the controls.  All will be prefixed with the contents of prefix
    static sourceCodeId = 'source_code';
    static cvalId = 'cval';
    static cvalbId = 'cvalb';
    static suitId = 'suit';
    static r0Id = 'r0';
    static r1Id = 'r1';
    static r2Id = 'r2';
    static inputQueueId = 'input_queue';
    static titleId = 'title';
    static registersId = 'regs';
    // A list of all the state variables used to generate the UI to display them
    static registerMap = [
        {name: "CVAL", id: CardHandlerUnit.cvalId},
        {name: "CVALB", id: CardHandlerUnit.cvalbId},
        {name: "SUIT", id: CardHandlerUnit.suitId},
        {name: "R0", id: CardHandlerUnit.r0Id},
        {name: "R1", id: CardHandlerUnit.r1Id},
        {name: "R2", id: CardHandlerUnit.r2Id},
        {name: "INPUT", id: CardHandlerUnit.inputQueueId},
    ];

    /** render draws the UI for this CHU in the provided div name
    Example of generated HTML:
        <div id="prefix_title">Name</div>
        <textarea id="prefix_source_code" rows="10" cols="20"></textarea>
        <table id="prefix_regs">
            <tr><td>CVAL</td><td><input readonly="" size="4" id="prefix_cval"></td></tr>
            <tr><td>CVALB</td><td><input readonly="" size="4" id="prefix_cvalb"></td></tr>
            <tr><td>SUIT</td><td><input readonly="" size="4" id="prefix_suit"></td></tr>
            <!-- other state rows continue -->
        </table>
    */
    render(containerId) {
        var wrapper = document.getElementById(containerId);
        var title = document.createElement('div');
        title.innerHTML = this.name;
        title.id = this.prefix + CardHandlerUnit.titleId;
        wrapper.appendChild(title);
        var sourceCode = document.createElement('textarea');
        sourceCode.id = this.prefix + CardHandlerUnit.sourceCodeId;
        sourceCode.rows = 10;
        sourceCode.cols = 20;
        try {
            var prev = localStorage.getItem(this.prefix);
            if (prev != null) {
                sourceCode.value = localStorage.getItem(this.prefix);
            }
        } catch(err) {
            // local storage is disabled or absent;
        }
        wrapper.appendChild(sourceCode);
        var regs = document.createElement('table');
        regs.id = this.prefix + CardHandlerUnit.registersId;
        for (const reg of CardHandlerUnit.registerMap) {
            var row = document.createElement('tr');
            var nameBox = document.createElement('td');
            nameBox.innerHTML = reg.name;
            row.appendChild(nameBox);
            var valueBox = document.createElement('td');
            var value = document.createElement('input');
            value.readOnly = true;
            value.size = 4;
            value.id = this.prefix + reg.id;
            valueBox.appendChild(value);
            row.appendChild(valueBox);
            regs.appendChild(row);
        }
        regs.style.visibility = 'collapse';
        wrapper.appendChild(regs);
    }

    /** reset eliminates all state related to stepping through the program, leaving source code as is */
    reset() {
        this.currentLine = 0;
        this.card = "";
        this.reg = [0,0,0]
        this.resetCursor();
        this.inputQueue = [...this.initialInputQueue];
    }

    setEditMode(editMode) {
        if (editMode != this.editMode) {
            this.editMode = editMode;
            var sourceCode = document.getElementById(this.prefix + CardHandlerUnit.sourceCodeId)
            var regs = document.getElementById(this.prefix + CardHandlerUnit.registersId);
            if (this.editMode) {
                sourceCode.readOnly = false;
                regs.style.visibility = 'collapse';
                this.reset();
                sourceCode.value = this.rawInst.join("\n")
                CardHandlerUnit.scrollToLine(sourceCode, this.currentLine);
            } else {
                sourceCode.readOnly = true;
                regs.style.visibility = 'visible';
                this.rawInst = sourceCode.value.split("\n")
                if (this.parseInstructions()) {
                    try {
                        localStorage.setItem(this.prefix, sourceCode.value);
                    } catch (err) {
                        // local storage is disabled, continue witout saving
                    }
                    CardHandlerUnit.addPadding(sourceCode, this.currentLine);
                    this.updateRegisters();
                } else {
                    // Errors should have been raised as alerts for now.  Disable the next and reset buttons
                    // until the code is edited
                    return false;
                }
            }
        }
        return true;
    }

    /** 
     * Executing an instruction is a two-stage pipeline.  Any instructions which
     * write a card value (that is, write to LEFT/RIGHT/UP/DOWN) are stalled until
     * the second stage.  Other instructions run in the first stage.  This lets 
     * all reads to complete before any input queues are modified
     */
    executeStage1() {

    }

    /** Execute the current instruction if it writes to an input queue */
    executeStage2() {

    }

    /** nextLine advances the CHU to the next instruction */
    nextLine() {
        this.currentLine++;
        // TODO: While label, currentLine++
        this.resetCursor();
    }

    /** Parse the raw instruction strings into a structured format - an array of token arrays, where each token array is a single instruction */
    parseInstructions() {
        this.inst = [];
        this.labels = new Map();
        for (var i = 0; i < this.rawInst.length; i++) {
            let instr = this.parseInst(this.rawInst[i], i);
            if (!instr.valid) {
                return false;
            }
            this.inst.push(instr.inst);
        }

        // TODO: Check the labels

        return true;
    }

    static validWritableRegister(regName) {
        return regName == "R0" || regName == "R1" || regName == "R2";
    }

    static validReadableRegister(regName) {
        return CardHandlerUnit.validWritableRegister(regName) || regName == "SUIT" || regName == "CVAL" || regName == "CVALB"
    }

    static validReadableOrLiteral(arg) {
        return CardHandlerUnit.validReadableRegister(arg) || CardHandlerUnit.isInteger(arg);
    }

    static validOutputRegister(regName) {
        return regName == "UP" || regName == "LEFT" || regName == "RIGHT" || regName == "DOWN";
    }

    static isInteger(val) {
        return parseInt(val, 10) != NaN;
    }

    /** Words that are not allowed to be labels */
    static validLabelName(label) {
        const reserved = ["READ", "RRAND", "DEAL", "SEND", "ADD", "SUB", "NEG", "JMP", "JZ", "JNZ", "JGZ", "NOP"];
        if (reserved.includes(label)) {
            return false;
        }

        // Labels must consist of a letter followed by letters and numbers
        return label.match(/^[A-Z][A-Z0-9]+$/);
    }

    /** Parse a single instruction */
    parseInst(line, lineNum) {
        var tokens = line.trim().toUpperCase().split(" ");
        if (tokens.length == 0) {
            this.showError(this.name + ": Empty line " + lineNum);
            return CardHandlerUnit.INVALID_INSTRUCTION;
        }

        const tooManyError = this.name + ": Too many arguments at line " + lineNum + "(" + line + ")";
        const tooFewError = this.name + ": Insufficient arguments at line " + lineNum + "(" + line + ")";

        switch (tokens[0]) {
        case "READ":
        case "RRAND":
        case "DEAL":
        case "NOP":
            if (tokens.length != 1) {
                this.showError(tooManyError);
                return CardHandlerUnit.INVALID_INSTRUCTION; 
            }
            break;

        case "SEND":
            if (tokens.length != 2) {
                this.showError(tokens.length == 1 ? tooFewError : tooManyError);
                return CardHandlerUnit.INVALID_INSTRUCTION; 
            }
            if (!CardHandlerUnit.validOutputRegister(tokens[1])) {
                this.showError(this.name + ": Invalid destination '" + tokens[1] + "' at line " + lineNum + "(" + line + ")");
                return CardHandlerUnit.INVALID_INSTRUCTION; 
            }
            break;

        case "ADD":
        case "SUB":
            if (tokens.length != 4) {
                this.showError(tokens.length < 4 ? tooFewError : tooManyError);
                return CardHandlerUnit.INVALID_INSTRUCTION; 
            }
            for (var i = 1; i <= 2; i++) {
                if (!CardHandlerUnit.validReadableOrLiteral(tokens[i])) {
                    this.showError(this.name + ": Invalid value '" + tokens[i] + "' at line " + lineNum + "(" + line + ")");
                    return CardHandlerUnit.INVALID_INSTRUCTION; 
                }
            }
            if (!CardHandlerUnit.validWritableRegister(tokens[3])) {
                this.showError(this.name + ": Cannot write to register '" + tokens[1] + "' at line " + lineNum + "(" + line + ")");
                return CardHandlerUnit.INVALID_INSTRUCTION; 
            }
            break;

        case "NEG":
            if (tokens.length != 2) {
                this.showError(tokens.length == 1 ? tooFewError : tooManyError);
                return CardHandlerUnit.INVALID_INSTRUCTION; 
            }
            if (!CardHandlerUnit.validWritableRegister(tokens[1])) {
                this.showError(this.name + ": Cannot write to register '" + tokens[1] + "' at line " + lineNum + "(" + line + ")");
                return CardHandlerUnit.INVALID_INSTRUCTION; 
            }
            break;

        case "JMP":
            if (tokens.length != 2) {
                this.showError(tokens.length == 1 ? tooFewError : tooManyError);
                return CardHandlerUnit.INVALID_INSTRUCTION; 
            }
            if (!CardHandlerUnit.validLabelName(tokens[1])) {
                this.showError(this.name + ": Invalid label name '" + tokens[1] + "' at line " + lineNum + "(" + line + ")");
                return CardHandlerUnit.INVALID_INSTRUCTION; 
            }
            break;

        case "JZ":
        case "JNZ":
        case "JGZ":
            if (tokens.length != 3) {
                this.showError(tokens.length < 3 ? tooFewError : tooManyError);
                return CardHandlerUnit.INVALID_INSTRUCTION; 
            }
            if (!CardHandlerUnit.validReadableRegister(tokens[1])) {
                this.showError(this.name + ": Cannot read from register '" + tokens[1] + "' at line " + lineNum + "(" + line + ")");
                return CardHandlerUnit.INVALID_INSTRUCTION; 
            }
            if (!CardHandlerUnit.validLabelName(tokens[2])) {
                this.showError(this.name + ": Cannot write to register '" + tokens[2] + "' at line " + lineNum + "(" + line + ")");
                return CardHandlerUnit.INVALID_INSTRUCTION; 
            }
            break;

        default:
            // This could be a label
            if (tokens.length != 1) {
                this.showError(this.name + ": Incorrect syntax at line " + lineNum + "(" + line + ")");
                return CardHandlerUnit.INVALID_INSTRUCTION; 
            }
            var tok = tokens[0];
            if (tok.substr(tok.length - 1, 1) != ":") {
                this.showError(this.name + ": Incorrect syntax at line " + lineNum + "(" + line + ")");
                return CardHandlerUnit.INVALID_INSTRUCTION; 
            }
            // Trim off the colon
            tok = tok.substr(0, tok.length - 1);
            if (!CardHandlerUnit.validLabelName(tok)) {
                this.showError(this.name + ": Invalid label name '" + tok + "' at line " + lineNum + "(" + line + ")");
                return CardHandlerUnit.INVALID_INSTRUCTION; 
            }
            return CardHandlerUnit.validInstruction(["LABEL", tok]);
        }
        return CardHandlerUnit.validInstruction(tokens);
    }

    static INVALID_INSTRUCTION = {valid: false, tokens: []};
    static validInstruction(tokens) { return { valid: true, inst: tokens }};

    /** Indicate an error */
    showError(err) {
        // TODO: Nicer UI than just alerting
        alert(err);
    }

    resetCursor() {
        var sourceCode = document.getElementById(this.prefix + CardHandlerUnit.sourceCodeId)
        CardHandlerUnit.removePadding(sourceCode);
        CardHandlerUnit.addPadding(sourceCode, this.currentLine);
        CardHandlerUnit.scrollToLine(sourceCode, this.currentLine);
    }

    /** updateRegisters updates the UI for the state of the CHU */
    updateRegisters() {
        document.getElementById(this.prefix + CardHandlerUnit.cvalId).value = this.cval();
        document.getElementById(this.prefix + CardHandlerUnit.cvalbId).value = this.cvalb();
        document.getElementById(this.prefix + CardHandlerUnit.suitId).value = this.suit();
        document.getElementById(this.prefix + CardHandlerUnit.r0Id).value = this.reg[0];
        document.getElementById(this.prefix + CardHandlerUnit.r1Id).value = this.reg[0];
        document.getElementById(this.prefix + CardHandlerUnit.r2Id).value = this.reg[0];
        document.getElementById(this.prefix + CardHandlerUnit.inputQueueId).value = this.inputQueue.join(" ");
    }

    cval() {
        if (this.card.length < 2) {
            return 0;
        }
        switch (this.card.substr(0,1)) {
            case "A":
                return 1;
            case "2":
                return 2;
            case "3":
                return 3;
            case "4":
                return 4;
            case "5":
                return 5;
            case "6":
                return 6;
            case "7":
                return 7;
            case "8":
                return 8;
            case "9":
                return 9;
            case "T":
                return 10;
            case "J":
                return 11;
            case "Q":
                return 12;
            case "K":
                return 13;
            }
            alert(this.name + ": Invalid card value: " + this.card.substr(1,1));
            return 0;
    }

    cvalb() {
        var c = this.cval();
        if (c > 10) {
            return 10;
        }
        return c;
    }

    suit() {
        if (this.card.length < 2) {
            return 0;
        }
        switch (this.card.substr(1,1)) {
        case "S":
            return 1;
        case "H":
            return 2;
        case "D":
            return 3;
        case "C":
            return 4;
        }
        alert(this.name + ": Invalid suit: " + this.card.substr(1,1));
        return 0;
    }

    appendCard(card) {
        this.inputQueue.push(card);
    }

    static removePadding(textarea) {
        textarea.value = CardHandlerUnit.linesWithDelimiter(textarea.value).reduce(function(result, line) {
            return result + line.substring(2);
        }, "");
    }

    static addPadding(textarea, currentLine) {
        textarea.value = CardHandlerUnit.linesWithDelimiter(textarea.value).map(function(line, index) {
            if (index == currentLine) {
                return ">>" + line;
            } else {
                return "  " + line;
            }
        }).reduce(function(result, line) {
            return result + line;
        }, "");
    }

    static linesWithDelimiter(str) {
        return str.split(/(?<=\n)/);
    }

    static scrollToLine(textarea, line) {
        const numLines = textarea.value.split("\n").length;
        const lineHeight = textarea.scrollHeight / numLines;
        textarea.scrollTop = line * lineHeight;
    }
}

fullDeck = [
    "AS", "2S", "3S", "4S", "5S", "6S", "7S", "8S", "9S", "TS", "JS", "QS", "KS",
    "AH", "2H", "3H", "4H", "5H", "6H", "7H", "8H", "9H", "TH", "JH", "QH", "KH",
    "AD", "2D", "3D", "4D", "5D", "6D", "7D", "8D", "9D", "TD", "JD", "QD", "KD",
    "AC", "2C", "3C", "4C", "5C", "6C", "7C", "8C", "9C", "TC", "JC", "QC", "KC",
];

// TODO: Fabricate a better initial deck.  For now, shuffle
shuffleArray(fullDeck);

// Create the initial state.  There are 3 CHUs to display on the screen
var editMode = true;
var dealerCards = [];
var playerCards = [];
var controlCh = new CardHandlerUnit("Control", "control_", function(card) {
    alert("Control unit tried to deal card " + card);
}, fullDeck);
var ch1 = new CardHandlerUnit("CH1 (Dealer)", "ch1_", function(card) {
    dealerCards.push(card);
    updateDealtCards();
});
var ch2 = new CardHandlerUnit("CH2 (Whale)", "ch2_", function(card) {
    playerCards.push(card);
    updateDealtCards();
});
var allCh = [controlCh, ch1, ch2];

// Hookup the left/right outputs of each unit
var appendCh1 = function(card) { ch1.appendCard(card); };
var appendCh2 = function(card) { ch2.appendCard(card); };
controlCh.left = appendCh1;
ch2.left = appendCh1;
controlCh.right = appendCh2;
ch1.right = appendCh2;

window.onload = init;

function nextLine() {
    for (var ch of allCh) {
        ch.executeStage1()
        ch.executeStage2()
        ch.nextLine();
    }
}

function toggleEdit() {
    editMode = !editMode;
    var editBtn = document.getElementById('edit_button');
    var nextBtn = document.getElementById('next_button');
    var resetBtn = document.getElementById('reset_button');
    if (editMode) {
        editBtn.innerHTML = 'To Run Mode';
        nextBtn.disabled = true;
        resetBtn.disabled = true;
    } else {
        editBtn.innerHTML = 'To Edit Mode';
        nextBtn.disabled = false;
        resetBtn.disabled = false;
    }
    for (var ch of allCh) {
        if (!ch.setEditMode(editMode)) {
            // Transitioning mode failed.  Disable the next and reset buttons until the code is edited
            nextBtn.disabled = true;
            resetBtn.disabled = true;
        }
    }
}

function resetState() {
    for (var ch of allCh) {
        ch.reset();
    }
}

function updateDealtCards() {
    document.getElementById('dealer_cards').value = dealerCards.join(", ");
    document.getElementById('player_cards').value = playerCards.join(", ");
}

function init() {
    controlCh.render('control_container');
    ch1.render('ch1_container');
    ch2.render('ch2_container');
}

/* Randomize array in-place using Durstenfeld shuffle algorithm */
function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}
