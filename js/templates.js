const templates = {
    'info': function(element) {
        const node = $(`<img src="/assets/question_mark.svg" class="ignore"/>`);
        
        node.on('dblclick', () => $('.tooltip').addClass('wide'));

        return tooltip(node, element.innerHTML+'<br><br>Tip: double click to widen.');
    }
}

const observer = new (window.MutationObserver || window.WebKitMutationObserver)(() => {
    
    for (const key in templates) {
        $(key).each(function() {
            $(this).replaceWith(templates[key](this).attr({'template-tag': key}))
        });
    }
});
observer.observe(document, {
  subtree: true,
  childList: true,
});