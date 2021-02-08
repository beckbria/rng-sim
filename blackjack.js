import { CardHandlerUnit } from "./chu.js";
import { shuffleArray } from './helpers.js';

class BlackjackGame {
    constructor(useLocalStorage, controlProgram = "", program1 = "", program2 = "", initialDeck = null) {
        var fullDeck = initialDeck;
        if (fullDeck == null) {
            fullDeck = [
                "AS", "2S", "3S", "4S", "5S", "6S", "7S", "8S", "9S", "TS", "JS", "QS", "KS",
                "AH", "2H", "3H", "4H", "5H", "6H", "7H", "8H", "9H", "TH", "JH", "QH", "KH",
                "AD", "2D", "3D", "4D", "5D", "6D", "7D", "8D", "9D", "TD", "JD", "QD", "KD",
                "AC", "2C", "3C", "4C", "5C", "6C", "7C", "8C", "9C", "TC", "JC", "QC", "KC",
            ];
            shuffleArray(fullDeck);
        }

        // Create the initial state.  There are 3 CHUs to display on the screen
        this.editMode = true;
        this.dealerCards = [];
        this.playerCards = [];
        this.controlCh = new CardHandlerUnit("Control", "control_", useLocalStorage, controlProgram, fullDeck);
        this.ch1 = new CardHandlerUnit("CH1 (Dealer)", "ch1_", useLocalStorage, program1);
        this.ch2 = new CardHandlerUnit("CH2 (Whale)", "ch2_", useLocalStorage, program2);
        this.allCh = [this.ch2, this.ch1, this.controlCh];
        this.gameComplete = false;
        // Text representation of all the actions taken by the players at the blackjack table
        this.bjState = "";
        this.playerTotal = 0;
        this.dealerTotal = 0;

        // Hook up the left/right outputs of each unit
        var that = this;
        var appendCh1 = function (card) { that.ch1.appendCard(card); };
        var appendCh2 = function (card) { that.ch2.appendCard(card); };
        this.controlCh.left = appendCh1;
        this.ch2.left = appendCh1;
        this.controlCh.right = appendCh2;
        this.ch1.right = appendCh2;

        // Hook up the deal action of each unit
        this.controlCh.deal = function (card) {};
        this.ch1.deal = function (card) {
            that.dealerCards.push(card);
            that.updateDealtCards();
        };
        this.ch2.deal = function (card) {
            that.playerCards.push(card);
            that.updateDealtCards();
        };
    }

    runGame() {
        while (!this.gameComplete && this.nextLine()) {}
    }

    nextLine() {
        var success = true;
        // All units must go through each stage before any advances to the next
        for (var ch of this.allCh) {
            success &= ch.executeStage1();
        }
        for (var ch of this.allCh) {
            success &= ch.executeStage2();
        }
        for (var ch of this.allCh) {
            success &= ch.advanceToNextLine();
        }
    
        for (var ch of this.allCh) {
            ch.updateRegisters();
        }
    
        return success;
    }

    toggleEdit() {
        this.editMode = !this.editMode;
        this.resetDealtCards();
    }

    resetState() {
        for (var ch of this.allCh) {
            ch.reset();
        }
        this.resetDealtCards();
    }
    
    resetDealtCards() {
        this.dealerCards = [];
        this.playerCards = [];
        this.updateDealtCards();
    }
    
    // Updates the UI for what cards have been dealt.  Overridden by child classes,
    // so intentionally separate from updateBlackjackState
    updateDealtCards() {
        this.updateBlackjackState();
    }

    updateBlackjackState() {
        this.gameComplete = false;
    
        if (this.dealerCards.length == 0) {
            this.bjState = "Waiting for first dealer card";
            return;
        }
        this.dealerTotal = CardHandlerUnit.cardValueAdjusted(this.dealerCards[0])
        this.bjState = "Dealer face-up: " + this.dealerCards[0] + "(" + this.dealerTotal + ")" + "\n";
        var playerTarget = 17;
        if (this.dealerTotal < 7 && this.dealerTotal > 1) {
            playerTarget = 12;
        }
        this.bjState += "Player target: " + playerTarget + "\n"
    
        if (this.playerCards.length < 2) {
            this.bjState += "Waiting for initial player cards\n";
            return;
        }
    
        var softAceCount = 0;
        var stand = false;
        this.playerTotal = 0;
    
        // Draw cards for the player
        for (let i = 0; !stand && i < this.playerCards.length; i++) {
            var card = this.playerCards[i];
            var cv = CardHandlerUnit.cardValueAdjusted(card)
            this.playerTotal += cv
            if (cv == 1 && this.playerTotal <= 11) {
                this.playerTotal += 10;
                softAceCount++;
            }
    
            while (softAceCount > 0 && this.playerTotal > 21) {
                this.playerTotal -= 10;
                softAceCount--;
            }
            this.bjState += "Player draws " + card + " for a total of " + this.playerTotal;
            if (softAceCount > 0) {
                this.bjState += " (soft)";
            }
            this.bjState += "\n";
    
            if (this.playerTotal >= playerTarget && (this.playerTotal >= 18 || softAceCount == 0)) {
                stand = true;
                this.bjState += (this.playerTotal > 21 ? "Player busts\n" : "Player stands\n");
            }
        }
    
        if (!stand) {
            this.bjState += "Waiting for more player cards\n";
            return;
        }
    
        // Draw cards for the dealer
        stand = false;
        softAceCount = 0;
    
        for (var i = 1; !stand && i < this.dealerCards.length; i++) {
            var card = this.dealerCards[i];
            var cv = CardHandlerUnit.cardValueAdjusted(card)
            this.dealerTotal += cv
            if (cv == 1 && this.dealerTotal <= 11) {
                this.dealerTotal += 10;
                softAceCount++;
            }
    
            while (softAceCount > 0 && this.dealerTotal > 21) {
                this.dealerTotal -= 10;
                softAceCount--;
            }
            this.bjState += "Dealer draws " + card + " for a total of " + this.dealerTotal;
            if (softAceCount > 0) {
                this.bjState += " (soft)";
            }
            this.bjState += "\n";
    
            if (this.dealerTotal >= 17) {
                stand = true;
                this.bjState += (this.dealerTotal > 21 ? "Dealer busts\n" : "Dealer stands\n");
            }
        }
    
        if (!stand) {
            this.bjState += "Waiting for more dealer cards\n";
            return;
        }
    
        this.gameComplete = true;
        if (this.playerTotal > 21 || (this.playerTotal < this.dealerTotal && this.dealerTotal <= 21)) {
            this.bjState += "Dealer wins\n";
        } else if (this.playerTotal == this.dealerTotal) {
            this.bjState += "Tie\n";
        } else {
            this.bjState += "Player wins\n";
        }
    }
}

class BlackjackGameWithUi extends BlackjackGame {
    constructor() {
        const ch12defaultProgram = "LOOP:\nREAD\nDEAL\nJMP LOOP";
        super(
            true, // Try to load previous program from local state
            "LOOP:\nRRAND\nSEND LEFT\nRRAND\nSEND RIGHT\nJMP LOOP", // Control Program
            ch12defaultProgram, ch12defaultProgram);
        this.controlCh.deal = function (card) { alert("Control unit tried to deal card " + card); };
    }

    render() {
        this.controlCh.render('control_container');
        this.ch1.render('ch1_container');
        this.ch2.render('ch2_container');
        this.attachOnClick();
    }

    attachOnClick() {
        var that = this;
        document.getElementById('edit_button').onclick = function () { that.toggleEdit(); };
        document.getElementById('next_button').onclick = function () { that.nextLine(); };
        document.getElementById('run_button').onclick = function () { that.runGame(); };
        document.getElementById('reset_button').onclick = function () { that.resetState(); };
        document.getElementById('validate_button').onclick = function () { that.validate(); };
    }

    resetState() {
        if (!this.editMode) {
            this.disableStepButtons(false);
        }
        super.resetState();
    }

    updateDealtCards() {
        document.getElementById('dealer_cards').value = this.dealerCards.join(", ");
        document.getElementById('player_cards').value = this.playerCards.join(", ");
        super.updateDealtCards();
    }

    nextLine() {
        const success = super.nextLine();
        if (!success) {
            // Disable the "next" button since we can't advance.  Leave the "reset" button enabled
            this.disableStepButtons(true);
        }

        return success;
    }

    disableStepButtons(disabled) {
        const stepButtons = ['next_button', 'run_button', 'validate_button'].map(function(id) { return document.getElementById(id); });
        for (const b of stepButtons) {
            b.disabled = disabled;
        }
    }

    toggleEdit() {
        super.toggleEdit();
        const editBtn = document.getElementById('edit_button');
        const resetBtn = document.getElementById('reset_button');
        if (this.editMode) {
            editBtn.innerHTML = 'To Run Mode';
            resetBtn.disabled = true;
            this.disableStepButtons(true);
        } else {
            editBtn.innerHTML = 'To Edit Mode';
            resetBtn.disabled = false;
            this.disableStepButtons(false);
        }
        for (var ch of this.allCh) {
            if (!ch.setEditMode(this.editMode)) {
                // Transitioning mode failed.  Disable the next and reset buttons until the code is edited
                resetBtn.disabled = true;
                this.disableStepButtons(true);
            }
        }
    }

    updateBlackjackState() {
        super.updateBlackjackState();
        document.getElementById('blackjack_state').value = this.bjState;
    }

    validate() {
        // TODO: Extract code, create N UI-less blackjack games, run them and see if they succeeded and what the results were 
        alert("Validation TODO");
    }
}

export { BlackjackGame, BlackjackGameWithUi };