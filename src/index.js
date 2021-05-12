import { BlackjackGameWithUi } from "./blackjack.js";
import { Validate } from './validator.js';

var game = new BlackjackGameWithUi();
alert('Bar');
function validateGame() {
    document.getElementById('validation_state').value = '';
    const outcome = Validate(game.chuState());
    if (outcome.success) {
        alert("Congratulations! " + outcome.msg);
    } 
    document.getElementById('validation_state').value = outcome.msg;
    document.getElementById('validation_state_wrapper').style.visibility = 'visible';
}

function setInitialDeck() {
    // Attempt to parse either space-separated or comma-separated lists
    const rawInput = prompt("Please provide the initial deck order (such as 'AC,2S,TD...' or 'AC 2S TD...'").trim();
    const byComma = rawInput.split(',');
    const bySpace = rawInput.split(' ');
    let success = false;
    if (byComma.length == 52) {
        success = game.setInitialDeck(byComma);
    } else if (bySpace.length == 52) {
        success = game.setInitialDeck(bySpace);
    }
    if (!success) {
        alert("Invalid deck provided - please include exactly one of each card");
    }
}

function resetToInitialDeck() {
    if (confirm("This will overwrite all CH programs.  Continue?")) {
        game.resetToStockProgram();
    }
}

window.onload = function () { 
    document.getElementById('validate_button').onclick = validateGame;
    document.getElementById('deck_button').onclick = setInitialDeck;
    document.getElementById('reset_stock_button').onclick = resetToInitialDeck;
    game.render(); 
};