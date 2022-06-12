;(function() {
//
let mcf = `scoreboard objectives add %sb% dummy`; // mcfunction
let mcc = '';                               // mc calculation

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
function sampleVariable(name) {
    return name + ' otherSB'
}
function parseStatement(statement) {
    let tree = math.parse(statement);

    let operations = [];
    function populate(node) {
        
        if (node.value != undefined) {
            addMCConstant(node.value);
        }
        if (node.args || node.content) {
            if (node.content) {
                node = node.content;
            }
            operations.push(node);
            for (let i = 0; i < node.args.length; i++) {
                populate(node.args[i]);
            }
        }
    }
    populate(tree);

    operations.reverse();
    
    let constantOps = [];
    let variableOps = [];
    let mixedOps = [];

    let lastIndex = 0;

    for (let i = 0; i < operations.length; i++) {
        const op = operations[i];

        if (op.args[0].name != undefined) {
            op.args[0].value = op.args[0].name;
        }
        if (op.args[1].name != undefined) {
            op.args[1].value = op.args[1].name;
        }

        op.index = i;

        if (op.args[0].value != undefined && op.args[1].value != undefined) {
            constantOps.push(op);
        } else if (op.args[0].value != undefined || op.args[1].value != undefined){
            mixedOps.push(op)
        } else {
            //variableOps.push(op);
        }
    }

    for (let i = 0; i < constantOps.length; i++) {
        let op = constantOps[i];
        let leftValue = op.args[0].value;
        let rightValue = op.args[1].value;

        if (op.args[0].name != undefined) {
            mcc += `\nscoreboard players operation #op${op.index} %sb% = ${sampleVariable(leftValue)}`;
            mcc += `\nscoreboard players operation #op${op.index} %sb% ${op.op}= #${rightValue} %sb%`;
        } else if (op.args[1].name != undefined) {
            mcc += `\nscoreboard players set #op${op.index} %sb% ${leftValue}`;
            mcc += `\nscoreboard players operation #op${op.index} %sb% ${op.op}= ${sampleVariable(rightValue)}`;
        } else {
            mcc += `\nscoreboard players set #op${op.index} %sb% ${leftValue}`;
            mcc += `\nscoreboard players operation #op${op.index} %sb% ${op.op}= #${rightValue} %sb%`;
        }

        lastIndex = op.index
    }
    for (let i = 0; i < mixedOps.length; i++) {
        let op = mixedOps[i];
        let opindex = 0;
        let otherop;
        let value   = 0;
        let order = 0;

        for (let i = 0; i < 2; i++) {
            if (op.args[i].index != undefined) {
                otherop = op.args[i];
                opindex = otherop.index;
                value = op.args[(i+1)%2];
                
                order = i;
                break;
            }
        }
        if (value==0) {
            for (let i = 0; i < 2; i++) {
                if (op.args[i].content != undefined) {
                    otherop = op.args[i].content;
                    opindex = otherop.index;
                    value = op.args[(i+1)%2];
                    order = i;
                    break;
                }
            }
        }        
        let isConstant = true;
        if (value.name != undefined) {
            isConstant = false;
        }
        value = value.value;

        for (const key in otherop.args) {
            const arg = otherop.args[key];
            if (arg.index != undefined) {
                opindex = arg.index
            }   
        }

        if (isConstant) {
            mcc += `\nscoreboard players set #op${op.index} %sb% ${value}`;
        } else {
            mcc += `\nscoreboard players operation #op${op.index} %sb% = ${sampleVariable(value)}`;
        }

        if (order == 1) {
            mcc += `\nscoreboard players operation #op${op.index} %sb% ${op.op}= #op${opindex} %sb%`;     
        } else {
            mcc += `\nscoreboard players operation #op${opindex} %sb% ${op.op}= #op${op.index} %sb%`;
        };
        op.index = otherop.index
        lastIndex = opindex;
    }
    for (let i = 0; i < variableOps.length; i++) {
        const op = variableOps[i];
        mcc += `\nscoreboard players operation #op${op.args[0].index} %sb% ${op.op}= #op${op.args[1].index} %sb%`;
        op.args[1].index = op.args[0].index;
    
    }
    mcc += `\n\nscoreboard players operation .out %sb% = #op${lastIndex} %sb%`;

    console.log(tree);

    console.log(statement + ' = '+ eval(statement));
    return mcf;
}

parseStatement( `(454 * (35 / 5) + 1) * 2 + 2 * 500` );

let out = ( mcf + '\n' + mcc ).replaceAll( '%sb%','math' );
console.log( out );

})()