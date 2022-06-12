window.scope = (function() {
if (window.math == undefined) {
    requestAnimationFrame(window.scope);
    return;
}
let mcf = '';
let mcc = '';

function compileJavaMath() {
    let str = '';
    mcc.replaceAll(' %sb%', '').replaceAll('%calc% ', '').replaceAll('#', '').split('\n').forEach(line => {
        let isSet = false;
        line = line.replace(/((.)+)\^\=(\s+)?/g, '$1=$1**');
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
function cutNumberFP(value) {
    let vstr = value+'';
    // vstr = vstr.substr(0, vstr.length - $('#fpInp').val()*1);
    return vstr;
}
function addMCConstant(value, isSpecial) {
    let line = `scoreboard players set #${isSpecial ? 'fractional_precision': cutNumberFP(value)} %sb% ${value}`;
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
        return '#'+ cutNumberFP(node.value) + ' %sb%'
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
function addPower(node, arg1, arg2) {
    let str='\n';
    
    if (arg1.value !== undefined) {
        str += `%set% in %sb2% = ${arg1}\n`;
    } else {
        str += `%calc% in %sb2% = ${sampleOperation(arg1)}\n`;
    }
    
    if (arg2.value !== undefined) {
        str += `%set% in2 %sb2% = ${arg2}\n`;
    } else {
        str += `%calc% in2 %sb2% = ${sampleOperation(arg2)}\n`;
    }

    str += `function math:power\n`;
    str += `%calc% ${sampleOperation(node)} = .out math\n\n`;
    mcc=str+mcc;
}
function parseStatement(statement, options = {}) {

    if (statement.match(/[0-9]\.[0-9]/g)) {
        throw new TypeError('decimals are against minecraft rules.')
    }

    let scope = {};
    // let fractionalPrecision = 10**$('#fpInp').val();

    $('.sbVariables > div').each(function() {
        let inputs = $(this).children('input');
        let name = sampleVariable(inputs[1].value);
        scope[name] = 1;
    });

    let keys = Object.keys(scope).sort((a,b) => b.length - a.length);
    keys.forEach(key => {
        statement = statement.replaceAll(sampleVariable(key, true), key);
    });
    //summon marker ~ ~ ~ {Tags:["javamath"],data:{}}
    mcf = `# Statement is: ${statement}\n# Result when all defined variables equal to zero: 0\nscoreboard objectives add %sb% dummy\n`;
    mcc = '';
    // addMCConstant(fractionalPrecision, true)
    
    if (options.onlylog) return;

    let tree = math.parse(statement);
    if (tree.content) tree = tree.content;    

    let i = 0;

    function setIndicesPopulate(node) {
        node.index = i++;
        // if (node.value !== undefined) {
        //     node.value *= fractionalPrecision;
        // }
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

        let constant = getConstant(node);
        let mixed = getMixed(node);
        let variable = getVariable(node);

        if(constant) {
            let str = '';
            if (node.op=='^') {
                addPower(node, ...node.args);
            } else {
                if (node.args[0].name !== undefined) {
                    // Is variable
                str += `%calc% ${sampleOperation(node)} %sb% = ${sampleScoreboardOf(node.args[0])}\n`
                } else {
                    // Is number
                    str += `%set% ${sampleOperation(node)} %sb% ${node.args[0]}\n`
                }
                if (node.args[1].value !== undefined) {
                    addMCConstant(node.args[1]);
                }
                str += `%calc% ${sampleOperation(node)} %sb% ${node.op}= ${sampleScoreboardOf(node.args[1])}\n`;
                mcc = str+mcc;
            }
            
        } else if(mixed) {
            if (node.op=='^') {
                if (!mixed.order) {
                    addPower(node, mixed.ct, mixed.vr);
                } else {
                    addPower(node, mixed.vr, mixed.ct);
                }
            } else {
                let str = '';
                if (mixed.order) {
                    addMCConstant(mixed.ct);
                    str += `%calc% ${sampleOperation(mixed.vr)} %sb% ${node.op}= #${cutNumberFP(mixed.ct)} %sb%\n`;
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
            }
        } else if(variable) {
            if (node.op=='^') {
                addPower(node, ...node.args);
            } else {
                let str = '';
                str += `%calc% ${sampleOperation(node)} %sb% = ${sampleOperation(variable[0])} %sb%\n`;
                str += `%calc% ${sampleOperation(node)} %sb% ${node.op}= ${sampleOperation(variable[1])} %sb%\n`;
    
                mcc = str+mcc
            }
        }

        if (node.args) {
            node.args.forEach(populate);
        }
    }
    populate(tree);
    
    populate=null;
    setIndicesPopulate=null;

    //second pass
    
    // 0       1     2           3
    // %calc% <name> <objective> <operation> ...
    
    // 0     1      2           3
    // %set% <name> <objective> <value>

    let pass2 = '';
    mcc.split('\n').forEach(line => {
        let args = line.split(' ');
        
        // Before
        if (args[3] && args[3].length == 2 && args[3].includes('=')) {
            // pass2 += `\n%calc% ${args[1]} ${args[2]} *= ${fractionalPrecision}\n`
        }
        pass2 += line+'\n';
        
        // After
        // if (args[0] == '%set%') {
        //     pass2 += `execute store result entity @p[tag="javamath"]\n`
        // }

    });
    mcc = pass2;

    let js = compileJavaMath();

    let result = "can't proceed: either syntax error or variables are being used...";
    try {
        result = eval(js);
    } catch (error) {
        js = '';
    }
    
    if ($('#debugMode')[0] && $('#debugMode')[0].checked) {
        return js + '// Result: ' + result;
    }
    
    if (mcc) {
        mcc += `\n%calc% .out %sb% = ${sampleOperation({index:0})} %sb%`;
    }
    mcf += '\n\n'+mcc;
    return mcf = sampleVariable(
        // .replace('%%%', result)
        mcf
        .replaceAll('%set%', 'scoreboard players set')
        .replaceAll('%calc%', 'scoreboard players operation')
        .replaceAll('%sb%', options.sb||'math'),
        true
    )


}

// HTML Stuff
let equationInput = $('.inputForm');
let codeview = new CodeView({
    content: parseStatement(equationInput.val()),
    langs: ['mcfunction'],
}).init();

codeview.node.addClass('stickleftbottom')
$('.subBody').append(codeview.node);

function updateCode() {
    if (equationInput.val() == '') return;
    
    try {
        codeview.content = parseStatement(equationInput.val(), {
            sb: $('#masterSB').val()
        });
        codeview.activeLang = ($('#debugMode')[0] && $('#debugMode')[0].checked ? "javascript": "mcfunction");
        codeview.update();

        $('.errorInput').text('');
    } catch (error) {
        $('.errorInput').text(error.toString());
    }
}
$('#fpInp').bind('change', updateCode);
$('.pageCenter').bind('input', function(e) {
    if (e.target.id == 'fpInp') return;
    
    updateCode();
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
        <label trnslt='generic.objective'>Objective:</label>
        <input type="text" spellcheck="false" value=${sname}>
        <label trnslt='generic.name'>Name:</label>
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
window.scope();