class CardHandlerUnit {
    constructor(name, prefix, dealCallback) {
        this.name = name;
        this.prefix = prefix;
        this.currentLine = 0;
        this.inst = [""];
        this.editMode = true;
        this.card = "";
        this.reg = [0,0,0];
        this.dealCallback = dealCallback;
        this.upQueue = null;
        this.downQueue = null;
        this.leftQueue = null;
        this.rightQueue = null;
        this.editMode = true;
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
    static registerMap = [
        {name: "CVAL", id: CardHandlerUnit.cvalId},
        {name: "CVALB", id: CardHandlerUnit.cvalbId},
        {name: "SUIT", id: CardHandlerUnit.suitId},
        {name: "R0", id: CardHandlerUnit.r0Id},
        {name: "R1", id: CardHandlerUnit.r1Id},
        {name: "R2", id: CardHandlerUnit.r2Id},
        {name: "INPUT", id: CardHandlerUnit.inputQueueId},
    ];

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
        wrapper.appendChild(regs);
    }

    reset() {
        this.currentLine = 0;
        this.card = "";
        this.reg = [0,0,0]
    }

    setEditMode(editMode) {
        if (editMode != this.editMode) {
            this.editMode = editMode;
            var sourceCode = document.getElementById(this.prefix + CardHandlerUnit.sourceCodeId)
            if (this.editMode) {
                sourceCode.readOnly = false;
                this.currentLine = 0;
                sourceCode.value = this.inst.join("\n")
                CardHandlerUnit.scrollToLine(sourceCode, this.currentLine);
            } else {
                sourceCode.readOnly = true;
                this.inst = sourceCode.value.split("\n")
                CardHandlerUnit.addPadding(sourceCode, this.currentLine);
            }
        }
    }

    nextLine() {
        var sourceCode = document.getElementById(this.prefix + CardHandlerUnit.sourceCodeId)
        this.currentLine++;
        CardHandlerUnit.removePadding(sourceCode);
        CardHandlerUnit.addPadding(sourceCode, this.currentLine);
        CardHandlerUnit.scrollToLine(sourceCode, this.currentLine);
    }

    updateRegisters() {
        document.getElementById(this.prefix + CardHandlerUnit.cvalId).value = this.cval();
    }

    cval() {
        // TODO
        return "";
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

var editMode = true;
var dealerCards = [];
var playerCards = [];
var controlCh = new CardHandlerUnit("Control", "control_", function(card) {
    alert("Control unit tried to deal card " + card);
});
var ch1 = new CardHandlerUnit("CH1 (Dealer)", "ch1_", function(card) {
    dealerCards.push(card);
    updateDealtCards();
});
var ch2 = new CardHandlerUnit("CH2 (Whale)", "ch2_", function(card) {
    playerCards.push(card);
    updateDealtCards();
});
var allCh = [controlCh, ch1, ch2];

function nextLine() {
    for (var ch of allCh) {
        ch.nextLine();
    }
}

function toggleEdit() {
    editMode = !editMode;
    var editBtn = document.getElementById('edit_button');
    var nextBtn = document.getElementById('next_button');
    if (editMode) {
        editBtn.innerHTML = 'To Run Mode';
        nextBtn.disabled = true;
    } else {
        editBtn.innerHTML = 'To Edit Mode';
        nextBtn.disabled = false;
    }
    for (var ch of allCh) {
        ch.setEditMode(editMode);
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

window.onload = init;
