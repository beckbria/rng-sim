var editMode = true;
var currentLine = 0;

function toggleEdit() {
    editMode = !editMode;
    var editBtn = document.getElementById('editButton');
    var nextBtn = document.getElementById('nextButton');
    var pr1 = document.getElementById('pr1')
    if (editMode) {
        editBtn.innerHTML = 'To Run Mode';
        nextBtn.disabled = true;
        pr1.readOnly = false;
        currentLine = 0;
        removePadding(pr1);
        scrollToLine(pr1, currentLine);
    } else {
        editBtn.innerHTML = 'To Edit Mode';
        nextBtn.disabled = false;
        pr1.readOnly = true;
        addPadding(pr1, currentLine);
    }
}

function nextLine() {
    var pr1 = document.getElementById('pr1')
    currentLine++;
    removePadding(pr1);
    addPadding(pr1, currentLine);
    scrollToLine(pr1, currentLine);
}

function removePadding(textarea) {
    textarea.value = linesWithDelimiter(textarea.value).reduce(function(result, line) {
        return result + line.substring(2);
    }, "");
}

function addPadding(textarea, currentLine) {
    textarea.value = linesWithDelimiter(textarea.value).map(function(line, index) {
        if (index == currentLine) {
            return ">>" + line;
        } else {
            return "  " + line;
        }
    }).reduce(function(result, line) {
        return result + line;
    }, "");
}

function linesWithDelimiter(str) {
    return str.split(/(?<=\n)/);
}

function scrollToLine(textarea, line) {
    numLines = textarea.value.split("\n").length;
    lineHeight = textarea.scrollHeight / numLines;
    textarea.scrollTop = line * lineHeight;
}