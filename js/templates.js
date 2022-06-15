let templates = {
    'info': function(elemenet) {
        return tooltip($(`<img src="/assets/question_mark.svg" />`), elemenet.innerText);
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