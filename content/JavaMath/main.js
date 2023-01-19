import { functions } from "./functions.js";

(async function () {
await new Promise((resolve, reject) => {
  const loop = () => 'math' in window ? resolve(math) : setTimeout(loop, 10)
  loop();
});

const form = new Form({
    form: {
        equation: { label: "javamath.prop.equation", type: "text", value: 'sin(sin(b)/2)' },
        masterScoreboard: { label: "javamath.prop.mastersb", type: "text", value: "math" },
        operationLabel: { label: "javamath.prop.oplabel", type: "text", value: "#op%index%" },
        fractionalPrecision: { label: "javamath.prop.fractional_precision", type: "range", min: 0, max: 3, info: "javamath.prop.fractional_precision.desc" },
        variables: { label: "javamath.prop.variables", type: "node", builder({trigger}) {

            const wrapper = document.createElement('div');
            wrapper.style.flex = 1;
            wrapper.append(buildToolBar([
                {
                    icon: "/assets/add.svg",
                    description: "javamath.action.add_sb.desc",
                    click: () => {
                        addScore(undefined, undefined, trigger);
                        trigger();
                    }
                },
                {
                    icon: "/assets/delete.svg",
                    description: "javamath.action.empty_variables",
                    click: () => {
                        $('.variables').empty();
                        hideToolTip();
                        trigger();
                    }
                }
            ]));
            const variableWrapper = document.createElement('div');
            variableWrapper.classList.add('variables');

            wrapper.append(variableWrapper);
            return wrapper;
        } },
    },
    onChange() {
        updateCode();
    }
});
$('.pageCenter').prepend(form.build().node);

class MinecraftMathParser {
    constructor() {
        this.headerCode = '';
        this.bodyCode = '';
        this.scoreboard = 'math';
        this.fractionalPrecision = 2;
    }
    _index = 0;
    currentGroup = "";
    isGroupActive = false;
    quotedBySymbol = {
        '#': '$hash$',
        '.': '$dot$',
        '=': '$equal$',
        '<': '$lessthan$',
        '>': '$greaterthan$',
        '&': '$ampersand$',
        '!': '$not$',
        '@': '$at$',
        '~': '$tilde$'
    }
    inverseOperationsMap = {
        '/': '*',
        '*': '/'
    }
    orderSpecificOperations = {
        '/': true,
        '-': true,
        '%': true,
    }

    parse(equation) {
        this.headerCode = '';
        this.bodyCode = '';

        equation = this.quoteVariable(this.parseCommands(equation), false).replaceAll(/(\d)\$dot\$(\d)/g, '$1.$2');

        this.headerCode = `# ${equation}\nscoreboard objectives add %sb% dummy\n\n` + this.headerCode;

        let tree = math.parse(equation);
        if (tree.content) tree = tree.content;

        this.fractionalPrecision = 10 ** form.get('fractionalPrecision');
        this.defineConstant(this.fractionalPrecision, 'precision');

        this.setupTree(tree);
        this.populate(tree);

        this.addLine(`%calc% .out %sb% = ${this.getOperation({ index: 0 })} %sb%`, true);
        
        const code = this.headerCode + '\n' + '\n' + this.bodyCode;

        return this.quoteVariable(
            // .replace('%%%', result)
            code
                .replaceAll('%set%', 'scoreboard players set')
                .replaceAll('%calc%', 'scoreboard players operation')
                .replaceAll('%sb%', this.scoreboard),
            true
        );
    }
    setupTree(node, _isRoot = true) {
        if (_isRoot) this._index = 0;
        
        const args = node.args;
        if (!args) return;

        node.index = this._index++;

        for (let i = 0; i < args.length; i++) {
            args[i] = args[i].content || args[i];

            if ('value' in args[i]) args[i].value = Math.round(args[i].value * this.fractionalPrecision);

            this.setupTree(args[i], false);
        }
    }
    populate(node) {
        const isfn = this.isFn(node);
        const constantWithConstant = this.getParamterParamter(node);
        const constantWithOperation = this.getParamterOperation(node);
        const operationWithOperation = this.getOperationOperation(node);
        const operation = this.getOperation(node);

        this.startGroup();
        if (isfn) {
            // this.addFn(operation, node);
            
            throw new SyntaxError('Math functions are not yet supported!');
        }
        else if (constantWithConstant) { // a := b
            this.defineLeftSideOfOperation(operation, constantWithConstant[0]);

            this.defineIfConstant(node, 1);

            this.addLine(this.scaleOperation(
                `%calc% ${operation} %sb% ${node.op}= ${this.withScoreboardByVariable(constantWithConstant[1])}`, node
            ));

        } else if (constantWithOperation) { // op(n) := a
            const sideOperation = this.getOperation(constantWithOperation.operation);
            
            if (node.op in this.orderSpecificOperations && constantWithOperation.termBeforeOperation) {
                this.defineLeftSideOfOperation(operation, constantWithOperation.term);

                this.addLine(this.scaleOperation(`%calc% ${operation} %sb% ${node.op}= ${sideOperation} %sb%`, node));

            } else {

                this.defineIfConstant(constantWithOperation.term);
                
                this.addLine(this.scaleOperation(`execute store result score ${operation} %sb% run %calc% ${sideOperation} %sb% ${node.op}= ${this.withScoreboardByVariable(constantWithOperation.term)}`, node, node.op == '/' ? 1: 0));
            }
            
        } else if (operationWithOperation) { // op(n) := op(m)

            this.addLine(this.scaleOperation(`execute store result score ${operation} %sb% run %calc% ${this.getOperation(operationWithOperation[0])} %sb% ${node.op}= ${this.getOperation(operationWithOperation[1])} %sb%`, node));
        }
        this.endGroup();


        if (!node.args) return;
        node.args.forEach(child => this.populate(child));
    }
    isFn(node) {
        return node.op == '^' || node.isFunctionNode;
    }
    addFn(operation, node) {
        const name = node.name;
        const func = functions[name];

        if (!func) throw new SyntaxError(`Unsupported function "${name}"!`);
        if (node.args.length > func.args.length) throw new SyntaxError(`Too much arguments specified for function "${name}"!`);
        if (node.args.length < func.args.length) throw new SyntaxError(`Few arguments specified for function "${name}"!`);

        func.args.forEach((argumentName, i) => {
            const argumentNode = node.args[i];
            
            this.defineLeftSideOfOperation(argumentName, argumentNode);

            this.addLine(`execute store result ${operation} %sb% function %fnPaths%/${name}`);
        });
    }
    defineLeftSideOfOperation(name, node) {
        if (this.isConstant(node)) {
            return this.addLine(`%set% ${name} %sb% ${node}`);
        }
        if (node.isOperatorNode || node.isFunctionNode) {
            return this.addLine(`%calc% ${name} %sb% = ${this.getOperation(node)} %sb%`);
        }
        return this.addLine(`%calc% ${name} %sb% = ${this.withScoreboardByVariable(node)}`);
    }
    isParamter(node) {
        if (!node) return false;
        return node.isSymbolNode || node.isConstantNode;
    }
    isConstant(node, index = -1) {
        return index == -1 ? node.value: node.args[index].value != undefined;
    }
    defineIfConstant(node, index = -1) {
        if (this.isConstant(node, index)) {
            this.defineConstant(index == -1 ? node.value: node.args[index].value);
        }
    }
    startGroup() {
        this.currentGroup = "";
        this.isGroupActive = true;
    }
    endGroup() {
        this.isGroupActive = false;
        this.currentGroup && this.addLine(this.currentGroup + '\n');
    }
    addHeader(line) {
        this.headerCode += line + '\n';
    }
    addLine(line, toLast) {
        if (this.isGroupActive) {
            return this.currentGroup += line + '\n';
        }

        if (toLast) return this.bodyCode += '\n' + line;

        return this.bodyCode = line + this.bodyCode;
    }
    addLines(...lines) {
        lines.forEach(line => this.addLine(line));
    }
    defineConstant(value, name) {
        const line = `scoreboard players set #${name ?? value} %sb% ${value}`;

        if (this.headerCode.includes(line)) return;

        this.addHeader(line);
    }
    getParamterParamter(node) {
        if (this.isParamter(node)) return null;
        if (this.isParamter(node.args[0]) && this.isParamter(node.args[1])) {
            return node.args;
        }
        return null;
    }
    getParamterOperation(node) {
        if (this.isParamter(node)) return null;

        if (this.isParamter(node.args[0]) && !this.isParamter(node.args[1]) ||
            this.isParamter(node.args[1]) && !this.isParamter(node.args[0])) {

            if (this.isParamter(node.args[0])) return {
                term: node.args[0],
                operation: node.args[1],
                termBeforeOperation: true
            }

            return {
                term: node.args[1],
                operation: node.args[0]
            }
        }

        return null;
    }
    getOperationOperation(node) {
        if (this.isParamter(node)) return null;
        if (!this.isParamter(node.args[0]) && !this.isParamter(node.args[1])) {
            return node.args;
        }
        return null;
    }
    withScoreboardByVariable(node) {
        if (!node.name) return '#' + node.value + ' %sb%';
        if (/\$hash\$cmd\d+/.test(node.name)) node.name + ' %sb%';
        
        const inputs = $('.variables').find('input');

        const quotedName = this.quoteVariable(node.name, true);

        let scoreboard = "unknown";
        for (let i = 0; i < inputs.length; i += 2) {
            if (inputs[i + 1].value != quotedName) continue;

            scoreboard = inputs[i].value;
            break;
        }

        return node.name + ' ' +scoreboard;
    }
    quoteVariable(name, inverse = false) {
        const { quotedBySymbol } = this;
        
        if (inverse) {
            for (const symbol in quotedBySymbol) {
                const quotedSymbol = quotedBySymbol[symbol];

                name = name.replaceAll(quotedSymbol, symbol);
            }
            return name;
        }

        let quotedName = '';
    
        for (let i = 0; i < name.length; i++) {
            const char = name[i];
            quotedName += quotedBySymbol[char] || char;
        }
        return quotedName;
    }
    getOperation(node, add = 0) {
        return form.get('operationLabel').replaceAll('%index%', node.index + add);
    }
    parseCommands(equation) {
        let match;
        let i = 0;
        
        while (match = equation.match(/\[(((?![\[\]]).)+)\]/)) {

            this.addHeader(`execute store result score #cmd${i} %sb% run ${match[1]}`);

            equation = equation.replace(match[0], '#cmd' + i);
            i++;
        }
        return equation;
    }
    scaleOperation(line, node, add) {
        if (form.get('fractionalPrecision') == 0) return line;
        const inverseOperation = this.inverseOperationsMap[node.op];
        
        if (!inverseOperation) return line;

        const scalar = `%calc% ${this.getOperation(node, add)} %sb% ${inverseOperation}= #precision %sb%`;

        
        if (node.op == '/')
            return scalar + '\n' + line;
        
        return line + '\n' + scalar;
    }
}
const parser = new MinecraftMathParser();

const codeview = new CodeView({
    content: '# ...',
    langs: ['mcfunction'],
}).init();
codeview.node.addClass('stickleftbottom');

$('.subBody').append(codeview.node);

function updateCode() {
    const equation = form.get('equation');
    if (equation == '') return;

    try {
        parser.scoreboard = form.get('masterScoreboard');

        codeview.content = parser.parse(equation);
        codeview.update();

        form.setError('equation', '');    
    } catch (error) {
        // var aux = error.stack.split("\n").splice(0, 2).join('\n');
        
        form.setError('equation', error);
    }
}

function addScore(scoreboard, name, trigger) {
    name ??= "";
    scoreboard ??= form.get('masterScoreboard');

    const score = document.createElement('div');
    score.classList.add("sbForm");

    const action = document.createElement('img');
    action.classList.add('tool');
    action.src = "/assets/delete.svg";

    const objective = document.createElement('input');
    objective.placeholder = tl('generic.objective');
    objective.spellcheck = false;
    objective.value = scoreboard;

    const player = document.createElement('input');
    player.placeholder = tl('generic.name');
    player.spellcheck = false;
    player.value = name;
    
    score.append(action, objective, player);

    tooltip($(action), tl('javamath.action.remove_sb.desc'))

    action.addEventListener("click", () => {
        score.remove();
        hideToolTip();
        trigger?.();
    });
    objective.addEventListener('input', () => trigger?.());
    player.addEventListener('input', () => trigger?.());

    hideToolTip();

    $('.variables').append(score);
}

addScore(undefined, "a", () => form.onChange());
addScore(undefined, "b", () => form.onChange());
form.onChange();
})();