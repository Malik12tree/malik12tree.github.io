const scope = (function() {
if (window.math == undefined) {
    requestAnimationFrame(scope);
    return;
}
let mcf = '';
let mcc = '';

function compileJavaMath() {
    let str = '';
    mcc.replaceAll(' %sb%', '').replaceAll('%calc% ', '').replaceAll('#', '').split('\n').forEach(line => {
        let isSet = false;
        if (line.startsWith('%set%')) {
            let args = line.split(' ');
            line = 'let ' + args[1] + ' = ' + args[2];
            isSet = true;
        }
        str += line+'\n';
        if (!isSet && line != ''){
            let args = line.split(' ');
            str+= `${args[0]} = Math.floor(${args[0]})\n`;
        }
    });

    return str;
}

function addMCLine(line) {
    return mcf += '\n'+line;
}
function addMCConstant(value) {
    let line = `scoreboard players set #${value} %sb% ${value}`;
    if (!mcf.includes(line)) {
        addMCLine(line);
    }
    return mcf;
}
function isSingle(node) {
    return ['value','name']
           .includes(Object.keys(node)[0])
}
function getConstant(node) {
    if (isSingle(node)) return null;
    if (isSingle(node.args[0]) && isSingle(node.args[1])) {
        return node.args;
    }
    return null;
}
function getMixed(node) {
    if (isSingle(node)) return null;

    if ( isSingle(node.args[0]) && !isSingle(node.args[1]) ||
        isSingle(node.args[1]) && !isSingle(node.args[0]) ) {
        
        if (isSingle(node.args[0])) {
            return {
                ct: node.args[0],
                vr: node.args[1].content || node.args[1],
                order: 0,
            }
        } else {
            return {
                ct: node.args[1],
                vr: node.args[0].content || node.args[0],
                order: 1
            }
        }
    }

    return null;
}
function getVariable(node) {
    if (isSingle(node)) return null;
    if (!isSingle(node.args[0]) && !isSingle(node.args[1])) {
        return node.args
    }
    return null;
}
function sampleScoreboardOf(node) {
    if (node.name != undefined) {
        let inps = $('.sbVariables').find('input');
        let inp;
        for (let i = 0; i < inps.length; i+=2) {
            if(inps[i+1].value == sampleVariable(node.name,true)) {
                inp = inps[i];
                break;
            }
        }
        if (inp) {
            return node.name + ' ' + inp.value;
        }
        return node.name + ' otherSB'
    } else {
        return '#'+node.value + ' %sb%'
    }
}

let symbols = [
    ['#','$hash$'],
    ['.','$dot$'],
    [',','$comma$'],
    ['=','$equal$'],
    ['<','$lessthan$'],
    ['>','$greaterthan$'],
    ['&','$ampersand$'],
    ['!','$not$'],
    ['@','$at$'],
    ['%','$percent$'],
    ['~','$tilde$']
]
function sampleVariable(name, inverse=false) {
    symbols.forEach(symbol => {
        if (!inverse) {
            name = name.replaceAll(symbol[0],symbol[1]);
        } else {
            name = name.replaceAll(symbol[1],symbol[0]);
        }
    });
    return name;
}
function sampleOperation(node) {
    return $('#opLabel').val().replaceAll('%index%', node.content ? node.content.index: node.index);
}

function parseStatement(statement, options = {}) {    
    let scope = {};
    $('.sbVariables > div').each(function() {
        let inputs = $(this).children('input');
        let name = sampleVariable(inputs[1].value);
        scope[name] = 1;
    });

    let keys = Object.keys(scope).sort((a,b) => b.length - a.length);
    keys.forEach(key => {
        statement = statement.replaceAll(sampleVariable(key, true), key);
    });
    mcf = `# Statement is: ${statement}\n# Result In Minecraft: %%%\n# Mathmatical Result: ${math.evaluate(statement, scope)}\nscoreboard objectives add %sb% dummy`;
    mcc = '';
    
    if (options.onlylog) return;

    let tree = math.parse(statement);
    if (tree.content) tree = tree.content;    

    let i = 0;

    function setIndicesPopulate(node) {
        node.index = i++;

        if (node.args) {
            if (node.args[0].content) {
                node.args[0] = node.args[0].content;
            }
            if (node.args[1].content) {
                node.args[1] = node.args[1].content;
            }
            node.args.forEach(arg => {
                if (arg.content) arg = arg.content;
                setIndicesPopulate(arg);
            });
        }
    }
    setIndicesPopulate(tree);
 
    function populate(node) {        
        if (node.content) node = node.content;

        // let single = isSingle(node);
        let constant = getConstant(node);
        let mixed = getMixed(node);
        let variable = getVariable(node);

        if(constant) {
            let str = '';
            if (node.args[0].name !== undefined) {
                // Is variable
                
                str += `%calc% ${sampleOperation(node)} %sb% = ${sampleScoreboardOf(node.args[0])}\n`
            } else {
                // Is number
                
                addMCConstant(node.args[1]);
                str += `%set% ${sampleOperation(node)} %sb% ${node.args[0]}\n`
            }
            str += `%calc% ${sampleOperation(node)} %sb% ${node.op}= ${sampleScoreboardOf(node.args[1])}\n`;

            mcc = str+mcc;
            
        } else if(mixed) {
            let str = '';
            if (mixed.order) {
                addMCConstant(mixed.ct);
                str += `%calc% ${sampleOperation(mixed.vr)} %sb% ${node.op}= #${mixed.ct} %sb%\n`;
                str += `%calc% ${sampleOperation(node)} %sb% = ${sampleOperation(mixed.vr)} %sb%\n`;

            } else {
                if (mixed.ct.name != undefined) {
                    str = `%calc% ${sampleOperation(node)} %sb% = ${sampleScoreboardOf(mixed.ct)}\n`;
                } else {
                    str = `%set% ${sampleOperation(node)} %sb% ${mixed.ct}\n`;
                }
                str += `%calc% ${sampleOperation(node)} %sb% ${node.op}= ${sampleOperation(mixed.vr)} %sb%\n`;
            }
            
            mcc = str+mcc;
        } else if(variable) {
            let str = '';
            str += `%calc% ${sampleOperation(node)} %sb% = ${sampleOperation(variable[0])} %sb%\n`;
            str += `%calc% ${sampleOperation(node)} %sb% ${node.op}= ${sampleOperation(variable[1])} %sb%\n`;

            mcc = str+mcc
        }

        if (node.args) {
            node.args.forEach(populate);
        }
    }
    populate(tree);
    let js = compileJavaMath();
    let result = "can't proceed: either syntax error or variables are being used...";
    try {
        result = eval(compileJavaMath());
    } catch (error) {
        js = '';
    }
    
    if ($('#debugMode')[0].checked) {
        return js + '\n// Result: ' + result;
    }
    
    if (mcc) {
        mcc += `\n%calc% .out %sb% = ${sampleOperation({index:0})} %sb%`;
    }
    mcf += '\n\n'+mcc;
    return mcf = sampleVariable(
        mcf
        .replace('%%%', result)
        .replaceAll('%set%', 'scoreboard players set')
        .replaceAll('%calc%', 'scoreboard players operation')
        .replaceAll('%sb%', options.sb||'math'),
        true
    )


}

// HTML Stuff
let equationInput = $('.inputForm');
let codeview = new CodeView({
    content: `. . .`,
    langs: ['mcfunction'],
}).init();

codeview.node.addClass('stickleftbottom')
$('.subBody').append(codeview.node);

$('.pageCenter').bind('input', function(e) {
    try {
        codeview.content = parseStatement(equationInput.val(), {
            sb: $('#masterSB').val()
        });
        codeview.activeLang = $('#debugMode')[0].checked ? "javascript": "mcfunction";
        codeview.update();

        $('.errorInput').text('');
    } catch (error) {
        $('.errorInput').text(error.toString());
    }
})
let actions = $('.toolbar').children();

$(actions[0]).bind('click', function() {
    addScore();
})
$(actions[2]).bind('click', function() {
    $('.sbVariables').empty();
    $('.tooltip').addClass('hidden');
})
let chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

function addScore(sname='math', pname, dvalue=0) {
    pname = pname || '#'+chars[$('.sbVariables').children().length % 52];
    let score = $(`
    <div class="sbForm">
        <img class="tool" src="/assets/delete.svg" onload="tooltip($(this), tl('javamath.action.remove_sb.desc'));">
        <label trnslt='javamath.prop.sbname'>Scoreboard Name:</label>
        <input type="text" spellcheck="false" value=${sname}>
        <label trnslt='javamath.prop.plname'>Player Name:</label>
        <input type="text" spellcheck="false" value=${pname}>
        </div>`);
        // <label trnslt='javamath.prop.dfvalue'>Default Value:</label>
        // <input type="number" min="-4294967296" max="4294967296" value=${dvalue}>

    score.find('img').bind('click', function() {
        score.remove();
        $('.tooltip').addClass('hidden');
    })
    $('.tooltip').addClass('hidden');
    
    $('.sbVariables').append(score);
}
addScore();
addScore();
// scoreboard players set (.)+ (.)+/g
// example visulized
// (454 * (35 / 5) + 1) * 2 + 2 * 500
// (454 * 7 + 1) * 2 + 2 * 500
// (454 * 7 + 1) * 2 + 1000
// (3178 + 1) * 2 + 1000
// (3179) * 2 + 1000
// 6358 + 1000
// 7358
// :)
});
scope();