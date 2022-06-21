window.scope = (function() {
if (window.math == undefined) {
    requestAnimationFrame(window.scope);
    return;
}
let mcf = '';
let mcc = '';

// function compileJavaMath() {
//     let str = '';
//     mcc.replaceAll(' %sb%', '').replaceAll('%calc% ', '').replaceAll('#', '').split('\n').forEach(line => {
//         let isSet = false;
//         line = line.replace(/((.)+)\^\=(\s+)?/g, '$1=$1**');
//         if (line.startsWith('%set%')) {
//             let args = line.split(' ');
//             line = 'let ' + args[1] + ' = ' + args[2];
//             isSet = true;
//         }
//         str += line+'\n';
//         if (!isSet && line != ''){
//             let args = line.split(' ');
//             str+= `${args[0]} = Math.floor(${args[0]})\n`;
//         }
//     });

//     return str;
// }

function addMCLine(line) {
    return mcf += '\n'+line;
}
function cutNumberFP(value) {
    return value;
}
function addMCConstant(value, isSpecial) {
    let line = `scoreboard players set #${isSpecial ? 'precision': cutNumberFP(value)} %sb% ${value}`;
    if (!mcf.includes(line)) {
        addMCLine(line);
    }
    return mcf;
}
function isSingle(node) {
    if (!node) return false;
    return ['value','name'].includes(Object.keys(node)[0])||
            ['value','name'].includes(Object.keys(node)[1])
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
                vr: node.args[1],
                order: 0,
            }
        } else {
            return {
                ct: node.args[1],
                vr: node.args[0],
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
        if (/\$hash\$cmd\d+/.test(node.name)) {
            return node.name + ' %sb%';
        }
        
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
        return node.name +' unknown';
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
    // ['%','$percent$'],
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
    return $('#opLabel').val().replaceAll('%index%', node.index);
}
function addFn(node, ...args) {
    let str='\n';
    
    
    args.forEach((arg,i) => {
        if (!arg) return;
        
        if (arg.value !== undefined) {
            str += `%set% in${i||''} %sb% = ${arg}\n`;
        } else {
            str += `%calc% in${i||''} %sb% = ${sampleScoreboardOf(arg)}\n`;
        }
    });
    let name = node.fn=='pow' ? 'power': node.fn;
    str += `function ${getMCFPath()}utils/${name}\n`;
    str += `%calc% ${sampleOperation(node)} = .out math\n\n`;
    mcc=str+mcc;

}
function isFn(node) { 
    return node.op == '^' || typeof node.fn === 'object';
}
let simplificationRules = [
     // a * b
    {
        type: 'operate',
        pattern: /((?<=\s)|^)(?<left>\d+)\*(?<right>\d+)/,
        operate: '*'
    },
     // (a + b)
    {
        type: 'operate',
        pattern: /\((\s+)?(?<left>\d+)(\s+)?\+(\s+)?(?<right>\d+)(\s+)?\)/,
        operate: '+'
    },
     // (a - b)
    {
        type: 'operate',
        pattern: /\((\s+)?(?<left>\d+)(\s+)?\-(\s+)?(?<right>\d+)(\s+)?\)/,
        operate: '-'
    },
     // (a) => a
    {
        type: 'replace',
        pattern: /\((((?![\*\+\-\/\%\^]).)+)\)/,
        source: '$1',
    },
     // a^2 =
    {
        type: 'replace',
        pattern: /\((((?![\*\+\-\/\%\^]).)+)\)/,
        source: '$1',
    },
]
function simplify(statement) {

    // pass 1
    for (let i = 0; i < simplificationRules.length; i++) {
        const rule = simplificationRules[i];
        
        let match = statement.match(rule.pattern);
        switch (rule.type) {
            case 'operate':
                while (match) {
                    statement = statement.replace(match[0], Math.floor(eval(`parseInt(match.groups.left)${rule.operate}parseInt(match.groups.right)`)))
                    match = statement.match(rule.pattern);
                }
                break;
            case 'replace':
                statement = statement.replace(rule.pattern, rule.source)
        }
    }

    return statement;
}
const CMD_PATTERN = /\[(((?![\[\]]).)+)\]/;
function createCommandsMap(statement) {    
    let match = statement.match(CMD_PATTERN);
    let i = 0;
    while (match) {
        mcf+= `execute store result score #cmd${i} %sb% run ${match[1]}\n`;
        statement = statement.replace(match[0], '#cmd'+i);
        
        match = statement.match(CMD_PATTERN);
        i++;
    }
    return statement;
}
function variableScalar(statement, variable) {
    if ($('#fpInp').val() == '0') return statement;
    if (variable.name === undefined) return statement;

    if ($('#vrscale')[0].checked && variable.isScaled)
        return `%calc% ${sampleScoreboardOf(variable)} *= #precision %sb%\n${statement}%calc% ${sampleScoreboardOf(variable)} /= #precision %sb%\n`;

    if (!$('#vrscale')[0].checked && !variable.isScaled)
        return `%calc% #temp %sb% = ${sampleScoreboardOf(variable)}\n%calc% #temp %sb% /= #precision %sb%\n${
            statement.replace(" "+sampleScoreboardOf(variable), " #temp %sb%")
        }`;

    return statement;
}
function parseStatement(statement, options = {}) {
    mcf='';

    const orignalStatement = statement;
    if (statement.match(/[0-9]\.[0-9]/g)) {
        // throw new TypeError('Decimals are against minecraft rules.')
    }
    
    statement = sampleVariable(simplify(createCommandsMap(statement)), false).replaceAll(/(?<=\d)\$dot\$(?=\d)/g, '.');
    
    mcf = `# Statement is: ${orignalStatement}\n# Compiled as : ${statement}\nscoreboard objectives add %sb% dummy\n`+mcf;
    
    mcc = '';
    if (options.onlylog) return;
    
    let tree = math.parse(statement);
    if (tree.content) tree = tree.content;    
    let i = 0;
    let fractional_precision = 10**parseInt($('#fpInp').val());
    addMCConstant(fractional_precision, true)

    function setupTree(node) {
        node.index = i++;

        if (node.args) {
            
            if ((node.op == '*' || node.op == '/') && getConstant(node)) {
                node.args[0].isScaled = true;
            }
            for (let i = 0; i < node.args.length; i++) {
                if (node.args[i].content) {
                    node.args[i] = node.args[i].content;
                }

                if ((node.op == '+' || node.op == '-') && isSingle(node.args[i])) {
                    number_of_scaled_plus_minus++;
                    node.args[i].isScaled = true;
                }
                if (node.args[i].isScaled && node.args[i].value) {
                    node.args[i].value = Math.round(node.args[i].value*fractional_precision);
                }
                
                setupTree(node.args[i]);
            }
        }
    }
    setupTree(tree);
    
    
    function populate(node) {
        let isfn = isFn(node);
        let constant = getConstant(node);
        let mixed = getMixed(node);
        let variable = getVariable(node);

        if (isfn) {
            console.log(node);
            throw new SyntaxError('Support of math functions is still in development!')
            // addFn(node, ...node.args);
        } else if(constant) { // a := b
            let str = '';
            if (node.args[0].name !== undefined) {
                // Is variable
                str += variableScalar(`%calc% ${sampleOperation(node)} %sb% = ${sampleScoreboardOf(node.args[0])}\n`, node.args[0])
            } else {
                // Is number
                str += `%set% ${sampleOperation(node)} %sb% ${node.args[0]}\n`
            }
            if (node.args[1].value !== undefined) {
                addMCConstant(node.args[1]);
            }
            str += variableScalar(`%calc% ${sampleOperation(node)} %sb% ${node.op}= ${sampleScoreboardOf(node.args[1])}\n`, node.args[1]);
            mcc = str+mcc;
            
        } else if(mixed) { // op(n) := a
            let str = '';
            if (mixed.order) {
                if (mixed.ct.value != undefined) {
                    addMCConstant(mixed.ct);
                }
                str += variableScalar(`execute store result score ${sampleOperation(node)} %sb% run %calc% ${sampleOperation(mixed.vr)} %sb% ${node.op}= ${sampleScoreboardOf(mixed.ct)}\n`,mixed.ct);
            } else {
                if (mixed.ct.name !== undefined) {
                    str = variableScalar(`\n%calc% ${sampleOperation(node)} %sb% = ${sampleScoreboardOf(mixed.ct)}\n`,mixed.ct);
                } else {
                    str = `%set% ${sampleOperation(node)} %sb% ${mixed.ct}\n`;
                }
                str += `%calc% ${sampleOperation(node)} %sb% ${node.op}= ${sampleOperation(mixed.vr)} %sb%\n`;
            }
            
            mcc = str+mcc;
        } else if(variable) { // op(n) := op(m)
            
            mcc = `execute store result score ${sampleOperation(node)} %sb% run %calc% ${sampleOperation(variable[0])} %sb% ${node.op}= ${sampleOperation(variable[1])} %sb%\n`
                  +mcc;
        }
        if (node.args) {
            node.args.forEach(populate);
        }
    }
    populate(tree);
    
    populate=null;
    setupTree=null;

    if (mcc) {
        // if (number_of_scaled_plus_minus>1) {
        //     mcc += `\nexecute store result score .out %sb% run %calc% ${sampleOperation({index:0})} %sb% /= ${10**number_of_scaled_plus_minus} math`;
        // } else {
        // }
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
function getMCFPath() {
    let namespace = $("#namespaceinp").val() + ':';
    let path = $("#pathinp").val();
    if (path) path += '/';
    return namespace + path;
}
// HTML Stuff
let equationInput = $('.inputForm');
const INCLUDES_UTILS = /(\^)|(sin\(.+\))|(cos\(.+\))|(tan\(.+\))|(sqrt\(.+\))|(abs\(.+\))|(pow\(.+\))/g;
const IS_UTIL = /\^|sin|cos|tan|sqrt|abs|pow/g;

// /\(\s?\d+\s?\*\s?\d\s?\)/g => ( a * b )

let codeview = new CodeView({
    content: parseStatement(equationInput.val()),
    langs: ['mcfunction'],
    // ondownload() {
    //     let statement = equationInput.val();

    //     if (!INCLUDES_UTILS.test(statement)) {
    //         codeview.download();
    //         return;
    //     }
        
    //     var zip = new JSZip();
    //     let namespacepath = $("#namespaceinp").val() + '/';
    //     let relativePath = $("#pathinp").val();
    //     if (relativePath) {
    //         relativePath += '/';
    //     }

    //     let path = 'data/' + namespacepath + relativePath;

    //     zip.file(path+'run.mcfunction', codeview.content);
        

    //     zip.generateAsync({type:"blob"}).then(function(content) {
    //         saveAs(content, $("#namespaceinp").val());
    //     });
    // }
}).init();

codeview.node.addClass('stickleftbottom')
$('.subBody').append(codeview.node);

function updateCode() {
    if (equationInput.val() == '') return;
    
    try {
        $('.errorInput').text('');

        codeview.content = parseStatement(equationInput.val(), {
            sb: $('#masterSB').val()
        });
        codeview.activeLang = ($('#debugMode')[0] && $('#debugMode')[0].checked ? "javascript": "mcfunction");
        codeview.update();
    } catch (error) { $('.errorInput').text(error) }
}
$('#fpInp').bind('change', updateCode);
$('.pageCenter').bind('input', function(e) {
    if (e.target.id == 'fpInp') return;
    
    updateCode();
})
let actions = $('.pageCenter .toolbar').children();

$(actions[0]).bind('click', function() {
    addScore();
})
$(actions[1]).bind('click', function() {
    $('.sbVariables').empty();
    $('.tooltip').addClass('hidden');
})
let chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

function addScore(sname='math', pname, dvalue=0) {
    pname = pname || '.'+chars[$('.sbVariables').children().length % 52];
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

window.scope=null;
});
window.scope();