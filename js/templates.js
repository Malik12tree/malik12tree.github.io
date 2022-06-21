let templates = {
    'info': function(elemenet) {
        let node = $(`<img src="/assets/question_mark.svg" class="ignore"/>`);
        node.on('dblclick', function(e) {
            $('.tooltip').addClass('wide')
        })
        return tooltip(node, elemenet.innerHTML+'<br><br>Tip: double click for wide view.');
    }
}

MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

var observer = new MutationObserver(function() {
    
    for (const key in templates) {
        $(key).each(function() {
            $(this).replaceWith(templates[key](this).attr({'template-tag': key}))
        })
    }
});
observer.observe(document, {
  subtree: true,
  childList: true,
});