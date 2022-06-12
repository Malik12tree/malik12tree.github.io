class CodeView {
    constructor(data){
        let scope = this;
        this.langs = data.langs;
        this.activeLang = data.activeLang || data.langs[0];
        this.node = $('<div class="codeview show"><div class="lines"></div><div class="toolbar"></div>');
        this.hidden = false;
        
        let buttons = [
            tooltip($('<img class="tool" src="/assets/expand_more.svg"/>'), tl('generic.toggle_visiblity')),
            tooltip($('<img class="tool" src="/assets/content_copy.svg"/>'), tl('generic.copy')),
            tooltip($('<img class="tool" src="/assets/file_download.svg"/>'), tl('generic.download'))
        ];
        buttons[0].on('click', function() {
            scope.hidden = scope.node.hasClass('show');
            
            if (scope.node.hasClass('show')) {
                scope.node.removeClass('show');
                scope.node.addClass('hide');
            } else {
                scope.update();
                scope.node.removeClass('hide');
                scope.node.addClass('show');
            }
        })
        buttons[1].on('click', () => scope.copy());
        buttons[2].on('click', () => scope.download());

        this.node.children('.toolbar').append(...buttons);

        // this.cursorNode = $('<div class="cursor"></div>');
        this.content = data.content || '';
    }
    get highlightingManger(){
        return Highlighers[this.activeLang];
    }
    update(){
        if (this.hidden) return;

        this.node.children('.lines').empty();
        this.content.split('\n').forEach(line => {
            if (line == '') {
                this.node.children('.lines').append('<br>')
                return;
            }
            let lineNode = $(`<div class='line'></div>`)
            
            let args = line.split(' ');
            let foundComment = false;

            args.forEach((arg, index) => {
                if (HLUtils.is(arg, ...this.highlightingManger.comment)) {
                    foundComment = true;
                };
                let type;
                if (foundComment) {
                    type = 'comment';
                } else {
                    type = HLUtils.getType(arg, args[index-1], args[index+1], this.highlightingManger, args);
                }
                let partNode = $(`<span>${foundComment ? arg: this.highlightingManger.applyRules(arg)} </span>`).addClass('cv-'+type);

                lineNode.append(partNode);
            });
            this.node.children('.lines').append(lineNode);
        });
    }
    init(){
        // let scope = this;
        // this.node.on('click', function() {
        //     scope.cursorNode.remove();
        //     scope.cursorNode.insertBefore(getSelectedNode());
        // });
        this.update();

        return this;
    }
    copy(){
        selectElement(this.node[0]);
        navigator.clipboard.writeText(this.content);
    }
    download(){
        downloadFile('equation.mcfunction', this.content);
    }
}

let HLUtils = {
    is(source, ...target){
        return target.includes(source);
    },
    getType(arg, argbefore, argafter, hl, line) {
        arg = arg.trim();
        let found = false;
        let type = 'any';

        for (const key in hl) {
            if (key=='applyRules') continue;
            const syntaxArg = hl[key];
            if (found) break;
            
            syntaxArg.forEach(value => {
                if (found) return;
                let match;

                if (typeof value == 'string') {
                    match = value == arg;
                }
                if (value instanceof RegExp) {
                    match = arg.match(value);
                }
                if (typeof value == 'function') {
                    match = value(arg, argbefore, argafter, line);
                }
                if (match) {
                    found = true;
                    type = key;
                }
            });
        }
        return type;
    }
}

let HighlighersData = {
    all: {
        operators: [ '+=', '-=', '*=', '/=', '<=', '>=', '=' ],
        isOp(arg) {
            return HLUtils.is(arg, ...HighlighersData.all.operators);
        }
    },
    mcfunction: {
        ops: ['add', 'enable', 'get', 'list', 'operation', 'remove', 'reset', 'set'],
        sops: ['objectives', 'players', 'store', 'result'],
    }
}
let Highlighers = {
    mcfunction: {
        keyword: [
            'advancement','attribute','ban','ban-ip','banlist','bossbar','clear','clone','data','datapack','debug','defaultgamemode','deop','difficulty','effect','enchant','execute','experience','fill','forceload','function','gamemode','gamerule','give','help','item','jfr','kick','kill','list','locate','locateboime','loot','me','msg','op','pardon','pardon-ip','particle','perf','place','placesound','publish','recipe','reload','save-all','save-off','save-on','say','schedule','scoreboard','seed','setblock','setidletimeout','setworldspawn','spawnpoint','spectate','spreadplayers','stop','stopsound','stopsound','summon','tag','team','teammsg','teleport','tell','tellraw','time','title','tm','tp','trigger','w','warden_spawn_tracker','weather','whitelist','worldborder','xp',
            'as', 'at',
        ],
        variable: [
            /\{.+\}/g,
            function(arg, argbefore, argafter, args) {
                if (args.includes('objectives')) return false;
                return argbefore && HLUtils.is(argbefore, ...HighlighersData.mcfunction.ops);
            }
        ],
        digit: [ /^[0-9]+$/g ],
        operator: [
            'run',
            HighlighersData.all.isOp,
            '\\^',
            '\\~',
            /\^([0-9]+)/g,
            /\~([0-9]+)/g
        ],
        secondary_keyword: [
            /\@a/g, /\@e/g, /\@p/g, /\@r/g, /\@s/g,
            function(arg, argbefore) {
                return HLUtils.is(argbefore, ...Highlighers.mcfunction.keyword, ...HighlighersData.mcfunction.sops)
            },
        ],
        comment: [
            '#'
        ],
        applyRules(arg){
            return arg
            .replaceAll(/\"((.)+)\"/g, "<span class=cv-digit>\"$1\"</span>")
        }
    },
    javascript: {
        keyword: ["await", "break", "case", "catch", "class","const", "continue", "debugger", "default", "delete","do", "else", "enum", "export", "extends","false", "finally", "for", "function", "if","implements", "import", "in", "instanceof", "interface","let", "new", "null", "package", "private","protected", "public", "return", "super", "switch","static", "this", "throw", "try", "true","typeof",	"var",	"void",	"while", "with","yield"
        ],
        digit: [ /^[0-9]+$/g ],
        operator: [
            HighlighersData.all.isOp
        ],
        comment: [
            '\/\/'
        ],
        secondary_keyword: [
            function(a, ab, af) {
                return HLUtils.is(ab, ...Highlighers.javascript.keyword) || HighlighersData.all.isOp(af);
            }
        ],
        applyRules(arg){ return arg}
    }
}