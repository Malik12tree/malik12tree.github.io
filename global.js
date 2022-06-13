// This file will be shared by all the pages

let pressing = {
    ctrl: false,
    shift: false,
    alt: false,
    map(event, value) {
        switch (event.key) {
            case 'Control':
                pressing.ctrl = value;       
                break;
            case 'Shift':
                pressing.shift = value;       
                break;
            case 'Alt':
                pressing.alt = value;
                break;
        }
    }
}
$(document.body).bind('keydown', e => pressing.map(e,true));
$(document.body).bind('keyup', e => pressing.map(e,false));
window.onfocus = () => {
    pressing.ctrl = pressing.shift = pressing.alt = false;
};

function search(value) {
    window.history.replaceState(null, null, "?"+value);
}

if (location.search == '?' || location.search == '') {
    search('Home')
}

let preload = {};

let page = 'Home';
function tl(id) { }

fetch('/lang/en.json').then(e => e.json()).then(e => {
    window.tl = id => {
        let final = '';
        id.split('+').forEach(tag => {
            final += e[tag] || tag;
        });
        return final;
    };
    load();
});
["Home", "JavaMath", "MGens", "MGens/MidiNoteBlock", "MGens/ParticleDraw"].forEach((page) => {
    fetch('/content/'+page).then( e => e.text()).then(e => {
        preload[page.toLowerCase()] = {
            path: page,
            content: e+`<script>links();</script>`
        };
    });
});

let themes = ['dark_mode', 'light_mode'];
let tmindex = 0;

$('#theme-selector').bind('click', function() {
    tmindex++;
    tmindex = tmindex % 2;
    localStorage.setItem('theme', tmindex);
    setTheme(themes[tmindex].replace('_','-').replace('mode','theme'));
    $('#theme-selector').attr('src', `/assets/${themes[tmindex]}.svg`);
})

function setTheme(theme) {
    if (theme == 'system') {
        theme = getSystemTheme();
    }

    $(':root').removeClass('dark-theme light-theme');
    $(':root').addClass(theme);
}
function getSystemTheme(params) {
    let isDarkTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return isDarkTheme ?  "dark-theme" : "light-theme";
}
if (localStorage.getItem('theme')) {
    for (let i = 0; i < parseInt(localStorage.theme); i++) {
        $('#theme-selector').click();
    }
} else {
    setTheme('dark-theme');
}

function animate() {
    requestAnimationFrame(animate);

    $('[trnslt]').each(function() {
        let id = $(this).attr('trnslt');;
        $(this).removeAttr('trnslt');
        $(this).text(tl(id));
    
    })
}

// creating pages
function switchPage(path, skipSearch=false) {
    if (preload[path.toLowerCase()] == undefined) {
        requestAnimationFrame(() => switchPage(path, skipSearch));
        return;
    }
    $('title').text('Malik12tree | '+path)

    path = preload[path.toLowerCase()].path;
    $('.subBody').html(
            preload[path.toLowerCase()].content
        );
   
    $('.tooltip').addClass('hidden');
    page = path;
    if (!skipSearch) {
        search(path);
    } else {
        skipSearch('Home');
    }
}

// creating links
let chachedImages = {};
function link(data) {
    let name = data.name;
    let id = data.id;
    let icon = data.icon;
    data.sec = data.sec || "datapack";

    let node = $( `<div class="card">
            ${!chachedImages[id] ? `<img src="${icon}" alt="${id}" ${data.color?'':'class="non_color"'}>`: ''}
            <h6>${name}</h6>
        </div>`);
    
    if (chachedImages[id]) {
        chachedImages[id].insertBefore(node.children('h6'));
    } else {
        chachedImages[id] = node.children('img');
    }

    node.bind('click', function() {
        if (pressing.ctrl) {
            window.open('?' + id, '_blank')
        } else {
            switchPage(id, data.skipSearch);
        }
    });

    tooltip(node, data.description);
    $(`.cardsContainer[sec="${data.sec}"]`).append(node);
    
    //                \\
    
    let listNode = $(`<li>${name}</li>`);
    
    listNode.bind('click', function() {
        switchPage(id, data.skipSearch);
    });
    $('.gens ul').append(listNode);
}
function separate() {
    $('.gens ul li:last-child').attr('style', 'border-bottom: 2px solid var(--color-subtle_text)');
}
let tooltipSize = {
    width  : 0,
    height : 0
}
function tooltip(node, text, delay=0) {
    let isHover = false;
    let timeout;
    node.hover(function (e) {
        tooltipSize.width = $('.tooltip').width();
        tooltipSize.height = $('.tooltip').height();

        timeout = setTimeout(() => {
                $('.tooltip').removeClass('hidden');
                $('.tooltip span').text(text);
            }, delay);

            isHover = true;
        }, function () {
            $('.tooltip').addClass('hidden');
            clearTimeout(timeout);            
            isHover = false;
        }
    );
    return node;
}
if (location.search.length > 1) {
    switchPage( location.search.substr(1) );
}

function load() {
    tooltip($('header h2'), 'yo mama', 5000);
    $('.loadingScreen').remove();

    // Pass mouse pos into css
    $(document.body).mousemove(function (e) { 
        e.clientX = Math.clamp( e.clientX, 0, window.innerWidth -  (tooltipSize.width  + 45) );
        e.clientY = Math.clamp( e.clientY, 0, window.innerHeight - (tooltipSize.height + 45) );
        $(":root")[0].style.setProperty('--mouse-x', e.clientX+'px');
        $(":root")[0].style.setProperty('--mouse-y', e.clientY+'px');
    });
    animate();
}
function links() {
    $('.gens ul').empty();

    link({
        name: tl('page.javamath'),
        id: "JavaMath",
        icon: "/assets/javamath.svg",
        description: tl('page.javamath.desc'),
    });
    separate();
    link({
        name: 'MGens',
        id: 'MGens',
        icon: "/assets/m.svg",
        description: tl('page.mgens.desc'),
        sec: "mgens",
        skipSearch:true,
        color: true
    });
    link({
        name: tl('page.midinoteblock'),
        id: 'MGens/MidiNoteBlock',
        icon: "/assets/graphic_eq.svg",
        description: tl('page.midinoteblock.desc'),
        sec: "mgens",
        skipSearch:true
    });
    link({
        name: tl('page.particledraw'),
        id: 'MGens/ParticleDraw',
        icon: "/assets/brush.svg",
        description: tl('page.particledraw.desc'),
        sec: "mgens",
        skipSearch:true
    });
}