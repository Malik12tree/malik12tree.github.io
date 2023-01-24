Math.clamp = function(x,min,max) {
    if (x <= min) return min;
    if (x >= max) return max;
    return x;
}

function selectElement(element) {
    var range, selection;
    
    if (window.getSelection && document.createRange) {
        selection = window.getSelection();
        range = document.createRange();
        range.selectNodeContents(element);
        selection.removeAllRanges();
        selection.addRange(range);
    } else if (document.selection && document.body.createTextRange) {
        range = document.body.createTextRange();
        range.moveToElementText(element);
        range.select();
    }
}
function downloadFile(name, content) {
    saveAs(new Blob([content], {type: "text/plain;charset=utf-8"}), name);
}

function isUUID(subject) {
	return subject.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
}
function isCombinationOf(subject, combination) {
    if (subject.length != combination.length) return false;

    return !/(.).*\1/.test(token);
}

const escape = document.createElement('textarea');
function escapeHTML(html) {
    escape.textContent = html;
    return escape.innerHTML;
}

function unescapeHTML(html) {
    escape.innerHTML = html;
    return escape.textContent;
}