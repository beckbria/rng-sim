import { getRandomInt, isLocalHost } from './helpers.js';

var debugMode = isLocalHost();

class CardHandlerUnit {
    constructor(name, prefix, useLocalStorage, initialProgram = "", initialInputQueue = []) {
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
        // Track the next line to advance to.  Used to allow jumps to specify the destination
        this.nextLine = 1;
        // Whether this node is currently allowing its source code to be edited
        this.editMode = true;
        // The card currently held by this CHU
        this.card = "";
        // General-purpose registers
        this.reg = [0, 0, 0, 0, 0];
        // The cards currently available in the input queue
        this.inputQueue = [...initialInputQueue];
        // A copy of the initial contents for reset purposes
        this.initialInputQueue = [...initialInputQueue];
        // Callback that takes a card when it is kept
        this.keep = null;
        // Callbacks that take a card function and add it to the input queue in that direction
        this.up = null;
        this.down = null;
        this.left = null;
        this.right = null;
        // Whether to read from/write to localStore with the program value
        this.useLocalStorage = useLocalStorage;
        // The program that is loaded if no user data exists in localStore during rendering
        this.initialProgram = initialProgram;
        // Whether this element has drawn UI elements
        this.hasUi = false;
        // The last error encountered
        this.lastError = "";
        // The function to call when an error is encountered
        this.showErrorCallback = function(err) { console.log(err); alert(err); }
        // Set to true if this unit is currently waiting to read input from an empty input queue
        this.waitingForRead = false;
    }

    // div IDs for the controls.  All will be prefixed with the contents of prefix
    static sourceCodeId = 'source_code';
    static cvalId = 'cval';
    static cvalbId = 'cvalb';
    static suitId = 'suit';
    static r0Id = 'r0';
    static r1Id = 'r1';
    static r2Id = 'r2';
    static r3Id = 'r3';
    static r4Id = 'r4';
    static inputQueueId = 'input_queue';
    static titleId = 'title';
    static registersId = 'regs';
    // A list of all the state variables used to generate the UI to display them
    static registerMap = [
        { name: "CVAL", id: CardHandlerUnit.cvalId },
        { name: "CVALB", id: CardHandlerUnit.cvalbId },
        { name: "SUIT", id: CardHandlerUnit.suitId },
        { name: "R0", id: CardHandlerUnit.r0Id },
        { name: "R1", id: CardHandlerUnit.r1Id },
        { name: "R2", id: CardHandlerUnit.r2Id },
        { name: "R3", id: CardHandlerUnit.r3Id },
        { name: "R4", id: CardHandlerUnit.r4Id },
        { name: "INPUT", id: CardHandlerUnit.inputQueueId },
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
        this.hasUi = true;
        var wrapper = document.getElementById(containerId);
        var title = document.createElement('div');
        title.innerHTML = this.name;
        title.id = this.prefix + CardHandlerUnit.titleId;
        wrapper.appendChild(title);
        var sourceCode = document.createElement('textarea');
        sourceCode.id = this.prefix + CardHandlerUnit.sourceCodeId;
        sourceCode.rows = 10;
        sourceCode.cols = 20;
        sourceCode.value = this.initialProgram;
        if (this.useLocalStorage) {
            try {
                var prev = localStorage.getItem(this.prefix);
                if (prev != null) {
                    sourceCode.value = localStorage.getItem(this.prefix);
                } else {
                    // Fill in the default program
                    sourceCode.value = this.initialProgram;
                }
            } catch (err) {
                // local storage is disabled or absent
                sourceCode.value = this.initialProgram;
            }
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
            // Hack for beta, figure out how to properly remove this later
            if (reg.name == "SUIT") {
                row.style.visibility = 'collapse';
            }
            regs.appendChild(row);
        }
        regs.style.visibility = 'collapse';
        wrapper.appendChild(regs);
    }

    /** reset eliminates all state related to stepping through the program, leaving source code as is */
    reset() {
        this.currentLine = 0;
        this.nextLine = 1;
        this.card = "";
        this.reg = [0, 0, 0, 0, 0]
        this.inputQueue = [...this.initialInputQueue];
        this.lastError = "";
        this.advanceToNextNonLabel();
        this.resetCursor();
        this.updateRegisters();
    }

    setEditMode(editMode) {
        if (editMode != this.editMode) {
            this.editMode = editMode;

            if (this.hasUi) {
                var sourceCode = document.getElementById(this.prefix + CardHandlerUnit.sourceCodeId);
                var regs = document.getElementById(this.prefix + CardHandlerUnit.registersId);
                if (this.editMode) {
                    sourceCode.readOnly = false;
                    regs.style.visibility = 'collapse';
                    this.reset();
                    sourceCode.value = this.rawInst.join("\n")
                    CardHandlerUnit.scrollToLine(sourceCode, this.currentLine);
                } else {    // Has UI, not in edit mode
                    sourceCode.readOnly = true;
                    regs.style.visibility = 'visible';
                    this.rawInst = sourceCode.value.split("\n")
                    if (this.parseInstructions()) {
                        if (this.useLocalStorage) {
                            try {
                                localStorage.setItem(this.prefix, sourceCode.value);
                            } catch (err) {
                                // local storage is disabled, continue witout saving
                            }
                        }
                        CardHandlerUnit.addPadding(sourceCode, this.currentLine);
                        this.updateRegisters();
                    } else {
                        // Errors should have been raised as alerts for now.  Disable the next and reset buttons
                        // until the code is edited
                        return false;
                    }
                }
            } else { // No UI (headless mode)
                if (this.editMode) {
                    this.reset();
                } else {
                    // Use the initial program
                    this.rawInst = this.initialProgram.split("\n");
                    if (this.parseInstructions()) {
                        this.updateRegisters();
                    } else {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    /** Extract the current program */
    program() {
        if (this.hasUi) {
            if (this.editMode) {
                return document.getElementById(this.prefix + CardHandlerUnit.sourceCodeId).value;
            } else {
                return this.rawInst.join("\n");
            }
        } else {
            return this.initialProgram;
        }
    }

    /** 
     * Executing an instruction is a two-stage pipeline.  Any instructions which
     * write a card value (that is, write to LEFT/RIGHT/UP/DOWN) are stalled until
     * the second stage.  Other instructions run in the first stage.  This lets 
     * all reads to complete before any input queues are modified
     */
    executeStage1() {
        const instr = this.inst[this.currentLine];
        this.waitingForRead = false;

        switch (instr[0]) {
            case "":
            case "LABEL":
            case "NOP":
            case "SEND":    // Send handled in stage 2
                break;

            case "READ":
            case "RRAND":
                if (this.card != "") {
                    this.showError("Attempted to read a card while containing a card");
                    return false;
                }
                if (this.inputQueue.length == 0) {
                    this.nextLine = this.currentLine;
                    this.waitingForRead = true;
                    return true;
                }
                var cardToTake = 0;
                if (instr[0] == "RRAND") {
                    // Take a random card instead
                    cardToTake = getRandomInt(this.inputQueue.length);
                }
                this.card = this.inputQueue[cardToTake];
                if (debugMode) {
                    console.log("CH: " + this.name + " read card '" + this.card + "' from index " + cardToTake);
                }
                this.inputQueue.splice(cardToTake, 1);
                break;

            case "KEEP":
                if (this.keep == null) {
                    this.showError("Attempted to keep but no keep output");
                    return false;
                }
                if (this.card == "") {
                    this.showError("Attempted to send a card when no card held");
                    return false;
                }
                this.keep(this.card);
                if (debugMode) {
                    console.log("CH: " + this.name + " keeping '" + this.card);
                }
                this.card = "";
                break;

            case "ADD":
            case "SUB":
                const first = this.readValue(instr[1]);
                const second = this.readValue(instr[2]);
                const result = instr[0] == "ADD" ? first + second : first - second;
                this.writeValue(instr[3], result);
                break;

            case "NEG":
                const inv = 0 - this.readValue(instr[1]);
                this.writeValue(instr[1], inv);
                break;

            case "JMP":
                this.nextLine = this.labels[instr[1]];
                break;

            case "JE":
                if (this.readValue(instr[1]) == this.readValue(instr[2])) {
                    this.nextLine = this.labels[instr[3]];
                }
                break;

            case "JNE":
                if (this.readValue(instr[1]) != this.readValue(instr[2])) {
                    this.nextLine = this.labels[instr[3]];
                }
                break;

            case "JGT":
                if (this.readValue(instr[1]) > this.readValue(instr[2])) {
                    this.nextLine = this.labels[instr[3]];
                }
                break;

            case "JGE":
                if (this.readValue(instr[1]) >= this.readValue(instr[2])) {
                    this.nextLine = this.labels[instr[3]];
                }
                break;

            case "JLT":
                if (this.readValue(instr[1]) < this.readValue(instr[2])) {
                    this.nextLine = this.labels[instr[3]];
                }
                break;

            case "JLE":
                if (this.readValue(instr[1]) <= this.readValue(instr[2])) {
                    this.nextLine = this.labels[instr[3]];
                }
                break;

            default:
                this.showError("INTERNAL ERROR: Unknown command " + instr);
        }

        return true;
    }

    /** Execute the current instruction if it writes to an input queue */
    executeStage2() {
        const instr = this.inst[this.currentLine];
        if (instr[0] == "SEND") {
            if (this.card == "") {
                this.showError("Attempted to send a card when no card held");
                return false;
            }
            var dest = null;
            switch (instr[1]) {
                case "LEFT":
                    dest = this.left;
                    break;
                case "RIGHT":
                    dest = this.right;
                    break;
                case "UP":
                    dest = this.up;
                    break;
                case "DOWN":
                    dest = this.down;
                    break;
                default:
                    this.showError("INTERNAL ERROR: invalid direction '" + instr[1] + "'");
                    return false;
            }

            if (dest == null) {
                this.showError("No output attached to direction " + instr[1]);
                return false;
            }
            dest(this.card);
            if (debugMode) {
                console.log("CH: " + this.name + " sending '" + this.card + "' to direction " + instr[1]);
            }
            this.card = "";
        }
        return true;
    }

    /** Reads a numeric literal or the value of a register named by the provided string */
    readValue(regOrLiteral) {
        if (CardHandlerUnit.validReadableRegister(regOrLiteral)) {
            switch (regOrLiteral) {
                case "R0":
                case "R1":
                case "R2":
                case "R3":
                case "R4":
                    return this.reg[this.regNum(regOrLiteral)];
                case "CVAL":
                    return this.cval();
                case "CVALB":
                    return this.cvalb();
                case "SUIT":
                    return this.suit();
                default:
                    this.showError("INTERNAL ERROR: readValue out of sync with validReadableRegister");
                    return 0;
            }
        }
        return parseInt(regOrLiteral, 10);
    }

    /** Writes to a register */
    writeValue(register, value) {
        this.reg[this.regNum(register)] = value;
    }

    regNum(register) {
        switch (register) {
            case "R0":
            case "R1":
            case "R2":
            case "R3":
            case "R4":
                return parseInt(register.substr(1, 1), 10);
            default:
                this.showError("INTERNAL ERROR: Attempt to access invalid register '" + register + "'");
                return 0;
        }
    }

    /** nextLine advances the CHU to the next instruction */
    advanceToNextLine() {
        this.currentLine = this.nextLine;
        this.nextLine = this.currentLine + 1;
        if (!this.advanceToNextNonLabel()) {
            return false;
        }
        this.resetCursor();
        return true;
    }

    advanceToNextNonLabel() {
        while (this.currentLine < this.inst.length && ["LABEL", ""].includes(this.inst[this.currentLine][0])) {
            this.currentLine++;
            this.nextLine = this.currentLine + 1;
        }
        if (this.currentLine >= this.inst.length) {
            // We've gone beyond the end of the program
            this.showError(this.name + ": Execution continued past end of program", this.rawInst.length - 1);
            return false;
        }
        return true;
    }

    /** Parse the raw instruction strings into a structured format - an array of token arrays, where each token array is a single instruction */
    parseInstructions() {
        this.inst = [];
        for (var i = 0; i < this.rawInst.length; i++) {
            let instr = this.parseInst(this.rawInst[i], i);
            if (!instr.valid) {
                return false;
            }
            this.inst.push(instr.inst);
        }

        // Check the labels
        this.labels = new Map();
        var labelsLookingForNextInst = [];
        for (var lineNum = 0; lineNum < this.inst.length; lineNum++) {
            if (this.inst[lineNum][0] == "") {
                continue;
            } else if (this.inst[lineNum][0] == "LABEL") {
                labelsLookingForNextInst.push(this.inst[lineNum][1]);
            } else {
                for (const label of labelsLookingForNextInst) {
                    if (this.labels.has(label)) {
                        this.showError("Duplicate label: '" + label + "'", lineNum);
                        return false;
                    }
                    this.labels[label] = lineNum;
                }
                labelsLookingForNextInst = [];
            }
        }
        if (labelsLookingForNextInst.length > 0) {
            this.showError("Labels with no following instruction: " + labelsLookingForNextInst, this.rawInst.length - 1);
            return false;
        }

        return this.advanceToNextNonLabel();
    }

    static validWritableRegister(regName) {
        return ["R0", "R1", "R2", "R3", "R4"].includes(regName);
    }

    static validReadableRegister(regName) {
        return CardHandlerUnit.validWritableRegister(regName) || ["SUIT", "CVAL", "CVALB"].includes(regName);
    }

    static validReadableOrLiteral(arg) {
        return CardHandlerUnit.validReadableRegister(arg) || CardHandlerUnit.isInteger(arg);
    }

    static validOutputRegister(regName) {
        return ["UP", "LEFT", "RIGHT", "DOWN"].includes(regName);
    }

    static isInteger(val) {
        return parseInt(val, 10) != NaN;
    }

    /** Words that are not allowed to be labels */
    static validLabelName(label) {
        const reserved = ["READ", "RRAND", "KEEP", "SEND", "ADD", "SUB", "NEG", "JMP", "JZ", "JNZ", "JGZ", "NOP"];
        if (reserved.includes(label)) {
            return false;
        }

        // Labels must consist of a letter followed by letters and numbers
        return label.match(/^[A-Z][A-Z0-9]+$/);
    }

    /** Parse a single instruction */
    parseInst(line, lineNum) {
        let tokens = line.trim().toUpperCase().split(" ");

        const tooManyError = "Too many arguments";
        const tooFewError = "Insufficient arguments";

        // Detect comments
        let command = tokens[0];
        if (command.length >= 1 && command.substr(0, 1) == "#") {
            // Treat a comment as a blank line
            tokens = [""];
            command = "";
        }

        switch (command) {
            case "":
            case "READ":
            case "RRAND":
            case "KEEP":
            case "NOP":
                if (tokens.length != 1) {
                    this.showError(tooManyError, lineNum);
                    return CardHandlerUnit.INVALID_INSTRUCTION;
                }
                break;

            case "SEND":
                if (tokens.length != 2) {
                    this.showError(tokens.length == 1 ? tooFewError : tooManyError, lineNum);
                    return CardHandlerUnit.INVALID_INSTRUCTION;
                }
                if (!CardHandlerUnit.validOutputRegister(tokens[1])) {
                    this.showError("Invalid destination '" + tokens[1] + "'", lineNum);
                    return CardHandlerUnit.INVALID_INSTRUCTION;
                }
                break;

            case "ADD":
            case "SUB":
                if (tokens.length != 4) {
                    this.showError(tokens.length < 4 ? tooFewError : tooManyError, lineNum);
                    return CardHandlerUnit.INVALID_INSTRUCTION;
                }
                for (var i = 1; i <= 2; i++) {
                    if (!CardHandlerUnit.validReadableOrLiteral(tokens[i])) {
                        this.showError("Invalid value '" + tokens[i] + "'", lineNum);
                        return CardHandlerUnit.INVALID_INSTRUCTION;
                    }
                }
                if (!CardHandlerUnit.validWritableRegister(tokens[3])) {
                    this.showError("Cannot write to register '" + tokens[3] + "'", lineNum);
                    return CardHandlerUnit.INVALID_INSTRUCTION;
                }
                break;

            case "NEG":
                if (tokens.length != 2) {
                    this.showError(tokens.length == 1 ? tooFewError : tooManyError, lineNum);
                    return CardHandlerUnit.INVALID_INSTRUCTION;
                }
                if (!CardHandlerUnit.validWritableRegister(tokens[1])) {
                    this.showError("Cannot write to register '" + tokens[1] + "'", lineNum);
                    return CardHandlerUnit.INVALID_INSTRUCTION;
                }
                break;

            case "JMP":
                if (tokens.length != 2) {
                    this.showError(tokens.length == 1 ? tooFewError : tooManyError, lineNum);
                    return CardHandlerUnit.INVALID_INSTRUCTION;
                }
                if (!CardHandlerUnit.validLabelName(tokens[1])) {
                    this.showError("Invalid label name '" + tokens[1] + "'", lineNum);
                    return CardHandlerUnit.INVALID_INSTRUCTION;
                }
                break;

            case "JE":
            case "JNE":
            case "JGT":
            case "JGE":
            case "JLT":
            case "JLE":
                if (tokens.length != 4) {
                    this.showError(tokens.length < 4 ? tooFewError : tooManyError, lineNum);
                    return CardHandlerUnit.INVALID_INSTRUCTION;
                }
                for (var i = 1; i <= 2; i++) {
                    if (!CardHandlerUnit.validReadableOrLiteral(tokens[i])) {
                        this.showError("Invalid value '" + tokens[i] + "'", lineNum);
                        return CardHandlerUnit.INVALID_INSTRUCTION;
                    }
                }
                if (!CardHandlerUnit.validLabelName(tokens[3])) {
                    this.showError("Invalid label name '" + tokens[3] + "'", lineNum);
                    return CardHandlerUnit.INVALID_INSTRUCTION;
                }
                break;

            default:
                // This could be a label
                if (tokens.length != 1) {
                    this.showError("Incorrect syntax", lineNum);
                    return CardHandlerUnit.INVALID_INSTRUCTION;
                }
                var tok = tokens[0];
                if (tok.substr(tok.length - 1, 1) != ":") {
                    this.showError("Incorrect syntax", lineNum);
                    return CardHandlerUnit.INVALID_INSTRUCTION;
                }
                // Trim off the colon
                tok = tok.substr(0, tok.length - 1);
                if (!CardHandlerUnit.validLabelName(tok)) {
                    this.showError("Invalid label name '" + tok + "'", lineNum);
                    return CardHandlerUnit.INVALID_INSTRUCTION;
                }
                return CardHandlerUnit.validInstruction(["LABEL", tok]);
        }
        return CardHandlerUnit.validInstruction(tokens);
    }

    static INVALID_INSTRUCTION = { valid: false, tokens: [] };
    static validInstruction(tokens) { return { valid: true, inst: tokens } };

    /** Indicate an error */
    showError(err, lineNum = null) {
        // TODO: Nicer UI than just alerting
        if (lineNum == null) {
            lineNum = this.currentLine;
        }
        this.lastError = this.name + ": " + err + " at line " + lineNum + " (" + this.rawInst[lineNum] + ")";
        this.showErrorCallback(this.lastError);
    }

    resetCursor() {
        if (this.hasUi) {
            var sourceCode = document.getElementById(this.prefix + CardHandlerUnit.sourceCodeId)
            CardHandlerUnit.removePadding(sourceCode);
            CardHandlerUnit.addPadding(sourceCode, this.currentLine);
            CardHandlerUnit.scrollToLine(sourceCode, this.currentLine);
        }
    }

    resetToStockProgram() {
       if (this.hasUi) {
            document.getElementById(this.prefix + CardHandlerUnit.sourceCodeId).value = this.initialProgram;
       } 
    }

    /** updateRegisters updates the UI for the state of the CHU */
    updateRegisters() {
        if (this.hasUi) {
            document.getElementById(this.prefix + CardHandlerUnit.cvalId).value = this.cval();
            document.getElementById(this.prefix + CardHandlerUnit.cvalbId).value = this.cvalb();
            document.getElementById(this.prefix + CardHandlerUnit.suitId).value = this.suit();
            document.getElementById(this.prefix + CardHandlerUnit.r0Id).value = this.reg[0];
            document.getElementById(this.prefix + CardHandlerUnit.r1Id).value = this.reg[1];
            document.getElementById(this.prefix + CardHandlerUnit.r2Id).value = this.reg[2];
            document.getElementById(this.prefix + CardHandlerUnit.r3Id).value = this.reg[3];
            document.getElementById(this.prefix + CardHandlerUnit.r4Id).value = this.reg[4];
            document.getElementById(this.prefix + CardHandlerUnit.inputQueueId).value = this.inputQueue.join(" ");
        }
    }

    cval() {
        return CardHandlerUnit.cardValue(this.card);
    }

    cvalb() {
        return CardHandlerUnit.cardValueAdjusted(this.card);
    }

    static cardValue(c) {
        if (c.length != 2) {
            return 0;
        }
        switch (c.substr(0,1)) {
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
            alert(this.name + ": Invalid card value: " + c.substr(0,1));
            return 0;
    }

    static cardValueAdjusted(c) {
        var cv = CardHandlerUnit.cardValue(c);
        return cv > 10 ? 10 : cv;
    }

    suit() {
        if (this.card.length < 2) {
            return 0;
        }
        switch (this.card.substr(1, 1)) {
            case "S":
                return 1;
            case "H":
                return 2;
            case "D":
                return 3;
            case "C":
                return 4;
        }
        alert(this.name + ": Invalid suit: " + this.card.substr(1, 1));
        return 0;
    }

    appendCard(card) {
        this.inputQueue.push(card);
    }

    static removePadding(textarea) {
        textarea.value = CardHandlerUnit.linesWithDelimiter(textarea.value).reduce(function (result, line) {
            return result + line.substring(2);
        }, "");
    }

    static addPadding(textarea, currentLine) {
        textarea.value = CardHandlerUnit.linesWithDelimiter(textarea.value).map(function (line, index) {
            if (index == currentLine) {
                return ">>" + line;
            } else {
                return "  " + line;
            }
        }).reduce(function (result, line) {
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

export { CardHandlerUnit };