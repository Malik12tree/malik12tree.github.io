;(async function() {
//
// This file will be shared by all the pages

// Theming
const themes = ['dark_mode', 'light_mode'];
let themeIndex = 0;

$('#theme-selector').bind('click', function() {
    themeIndex++;
    themeIndex = themeIndex % 2;
    localStorage.setItem('theme', themeIndex);
    setTheme(themes[themeIndex]);

    $('#theme-selector').attr('src', `/assets/${themes[themeIndex]}.svg`);
})

function setTheme(theme) {
    if (theme == 'system') {
        theme = getSystemTheme();
    } else {
        theme = theme.replace('_','-').replace('mode','theme');
    }

    $(':root').removeClass('dark-theme light-theme');
    $(':root').addClass(theme);
}
function getSystemTheme() {
    const isDarkTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return isDarkTheme ?  "dark-theme" : "light-theme";
}
const storedTheme = localStorage.getItem('theme');
if (storedTheme) {
    themeIndex = storedTheme;
    setTheme(themes[themeIndex]);
} else {
    setTheme('dark-theme');
}
//

const pressing = {
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

const preload = {};

let page = 'Home';

const language = await fetch('/lang/en.json').then(e => e.json());
Object.assign(window, {
    tl(id) {
        return language[id] || id;
    }
})
const pageNames = ["Home", "JavaMath"];
for (let i = 0; i < pageNames.length; i++) {
    const page = pageNames[i];
    const content = await fetch('/content/'+page).then( e => e.text() );
    
    preload[page] = {
        path: page,
        content: content
    };
}

// creating pages
function switchPage(path) {
    $('#page-info').hide();

    if (path.startsWith('https://')) return location.href = path;

    $('title').text('Malik12tree | ' + path)

    $('.subBody').empty();
    $('.subBody').append($(preload[path].content));
   
    hideToolTip();
    search(path);

    initPages();

    $('[definition]').each(function() {
        const id = $(this).attr('definition');
        $(this).removeAttr('definition');
        $(this).text(tl(id));
    });

    $('[pageScript]').remove();

    if (!(path in pageMap)) return;
    
    const { info, scripts } = pageMap[path];
    
    $('#page-info').show();
    $('#page-info')[0].onclick = () => {
        new Dialog({
            title: 'Info',
            lines: info,
        }).build().show();
    }


    scripts.forEach(script => {
        const scriptElement = document.createElement('script');
        for (const attribute in script) {
            if (attribute == "src") continue;
            const value = script[attribute];
            
            scriptElement.setAttribute(attribute, value);
        }
        const url = new URL(script.src, location);
        if (!script.src.startsWith('https://'))
            url.searchParams.set("_", Math.floor(Math.random()*0xffffff).toString(16));

        scriptElement.setAttribute('src', url.href);
        scriptElement.setAttribute('pageScript', '');

        document.head.append(scriptElement);
    });
}

const pageMap = {};
// creating links
function addPage(data) {
    const { name, id, icon, section = "datapack", color, description } = data;
    pageMap[id] = data;

    const node = document.createElement('div');
    node.classList.add('card');
    const title = document.createElement('h6');
    title.textContent = name;
    const img = new Image();
    img.src = icon;
    img.alt = id;
    if (!color) img.classList.add('non_color');

    node.append(img, title);

    node.addEventListener('click', () => {
        if (pressing.ctrl) {
            return window.open('?' + id, '_blank');
        }
        
        switchPage(id);
    });

    tooltip($(node), description);
    $(`.cardsContainer[sec="${section}"]`).append(node);
    
    //                \\
    
    const listNode = $(`<li>${name}</li>`);
    
    listNode.bind('click', () => switchPage(id));

    $('.gens ul').append(listNode);
}
const tooltipSize = {
    width  : 0,
    height : 0
}
Object.assign(window, {
    tooltip(node, text, delay=0) {
        let isHover = false;
        let timeout;
        node.hover(function (e) {
            tooltipSize.width = $('.tooltip').width();
            tooltipSize.height = $('.tooltip').height();
    
            timeout = setTimeout(() => {
                    $('.tooltip').removeClass('hidden');
                    $('.tooltip span').html(text);
                }, delay);
    
                isHover = true;
            }, function () {
                hideToolTip();
                $('.tooltip').removeClass('wide');
                clearTimeout(timeout);            
                isHover = false;
            }
        );
        return node;
    },
    hideToolTip() {
        $('.tooltip').addClass('hidden');
    }
});
if (location.search.length > 1) {
    switchPage( location.search.substr(1) );
}

function addDividerLine() {
    $('.gens ul li:last-child').attr('style', 'border-bottom: 2px solid var(--color-subtle_text)');
}
function initPages() {
    $('.gens ul').empty();

    addPage({
        name: tl('page.javamath'),
        id: "JavaMath",
        icon: "/assets/javamath.svg",
        description: tl('page.javamath.desc'),
        section: "datapack",
        info: tl("page.javamath.info"),
        scripts: [
            {
                src: 'https://cdnjs.cloudflare.com/ajax/libs/mathjs/11.5.0/math.js',
                integrity: 'sha512-PRRHSwgn8QJinp43y5B698YK/FApqSvwmd7kVu8NWMksCl/3daKnNbPNWPuGKDrpIIb+0Dg5W55VSbZi0QG60Q==',
                crossorigin:'anonymous',
                referrerpolicy: 'no-referrer'
            },
            {
                src: '/content/JavaMath/main.js',
                type: 'module'
            }
        ]
    });
    addDividerLine();
    addPage({
        name: 'MGens',
        id: 'https://malik12tree.github.io/MGens/',
        icon: "/assets/m.svg",
        description: tl('page.mgens.desc'),
        section: "mgens",
        color: true
    });
    addPage({
        name: tl('page.midinoteblock'),
        id: 'https://malik12tree.github.io/MGens/pages/datapack_gens/midi-to-noteblocks/midi-to-noteblocks.html',
        icon: "/assets/graphic_eq.svg",
        description: tl('page.midinoteblock.desc'),
        section: "mgens"
    });
    addPage({
        name: tl('page.particledraw'),
        id: 'https://malik12tree.github.io/MGens/pages/datapack_gens/particle-draw/particle-draw.html',
        icon: "/assets/brush.svg",
        description: tl('page.particledraw.desc'),
        section: "mgens"
    });
}


// Loaded
$("#home").bind('click', () => switchPage('Home'))
$('.loadingScreen').remove();

// Pass mouse pos into css
$(document.body).mousemove(function (e) { 
    e.clientX = Math.clamp( e.clientX, 0, window.innerWidth -  (tooltipSize.width  + 45) );
    e.clientY = Math.clamp( e.clientY, 0, window.innerHeight - (tooltipSize.height + 45) );
    $(":root")[0].style.setProperty('--mouse-x', e.clientX+'px');
    $(":root")[0].style.setProperty('--mouse-y', e.clientY+'px');
});
})();