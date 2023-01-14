(async function () {
await new Promise((resolve, reject) => {
  const loop = () => 'math' in window ? resolve(math) : setTimeout(loop, 10)
  loop();
});

const form = new Form({
    form: {
        equation: { label: "javamath.prop.equation", type: "text", value: 'a / b' },
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
    __index = 0;
    currentGroup = "";
    isGroupActive = false;

    setupTree(node, _isRoot = true) {
        if (_isRoot) this.__index = 0;
        
        const args = node.args;
        if (!args) return;

        node.index = this.__index++;

        for (let i = 0; i < args.length; i++) {
            args[i] = args[i].content || args[i];

            if ('value' in args[i]) args[i].value = Math.round(args[i].value * this.fractionalPrecision);

            this.setupTree(args[i], false);
        }
    }
    isVariable(node, index = -1) {
        return index == -1 ? node.name: node.args[index].name != undefined;
    }
    isConstant(node, index = -1) {
        return index == -1 ? node.value: node.args[index].value != undefined;
    }
    addIfConstant(node, index = -1) {
        if (this.isConstant(node, index)) {
            this.addConstant(index == -1 ? node.value: node.args[index].value);
        }
    }

    populate(node) {
        const isfn = this.isFn(node);
        const constantWithConstant = this.getConstantWithConstant(node);
        const constantWithOperation = this.getConstantWithOperation(node);
        const operationWithOperation = this.getOperationWithOperation(node);
        const operation = this.getOperation(node);

        this.startGroup();
        if (isfn) {
            throw new SyntaxError('Math functions are not yet supported!')
            // addFn(node, ...node.args);

        }
        else if (constantWithConstant) { // a := b
            let leftSide;
            if (this.isConstant(node, 0)) {

                leftSide = `%set% ${operation} %sb% ${node.args[0]}`;

            } else {
                
                leftSide = `%calc% ${operation} %sb% = ${this.addScoreboardByVariable(node.args[0])}`;

            }
            this.addLine(leftSide);
            
            this.addIfConstant(node, 1);

            this.addLine(this.scaleOperation(`%calc% ${operation} %sb% ${node.op}= ${this.addScoreboardByVariable(node.args[1])}`, node));

        } else if (constantWithOperation) { // op(n) := a
            
            this.addIfConstant(constantWithOperation.variable);

            const sideOperation = this.getOperation(constantWithOperation.operation);
            
            if (constantWithOperation.order) {
                this.addLine(this.scaleOperation(`execute store result score ${operation} %sb% run %calc% ${sideOperation} %sb% ${node.op}= ${this.addScoreboardByVariable(constantWithOperation.variable)}`, node));
            } else {
                this.addLines(
                    `%set% ${operation} %sb% ${constantWithOperation.variable}`,

                    this.scaleOperation(`%calc% ${operation} %sb% ${node.op}= ${sideOperation} %sb%`, node)
                );
            }
            
        } else if (operationWithOperation) { // op(n) := op(m)

            this.addLine(this.scaleOperation(`execute store result score ${operation} %sb% run %calc% ${this.getOperation(operationWithOperation[0])} %sb% ${node.op}= ${this.getOperation(operationWithOperation[1])} %sb%`, node));
        }
        this.endGroup();


        if (!node.args) return;
        node.args.forEach(child => this.populate(child));
    }
    parse(equation) {
        this.headerCode = '';
        
        equation = this.quoteVariable(this.parseCommands(equation), false).replaceAll(/(?<=\d)\$dot\$(?=\d)/g, '.');

        this.headerCode = `# ${equation}\nscoreboard objectives add %sb% dummy\n\n` + this.headerCode;

        this.bodyCode = '';

        let tree = math.parse(equation);
        if (tree.content) tree = tree.content;

        this.fractionalPrecision = 10 ** form.get('fractionalPrecision');
        this.addConstant(this.fractionalPrecision, true);

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
    addHeader(line) {
        this.headerCode += line + '\n';
    }
    startGroup() {
        this.currentGroup = "";
        this.isGroupActive = true;
    }
    endGroup() {
        this.isGroupActive = false;
        this.currentGroup && this.addLine(this.currentGroup + '\n');
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
    addConstant(value, isSpecial) {
        const line = `scoreboard players set #${isSpecial ? 'precision' : value} %sb% ${value}`;

        if (this.headerCode.includes(line)) return;

        this.addHeader(line);
    }
    isSingle(node) {
        if (!node) return false;
        return 'value' in node || 'name' in node;
    }
    getConstantWithConstant(node) {
        if (this.isSingle(node)) return null;
        if (this.isSingle(node.args[0]) && this.isSingle(node.args[1])) {
            return node.args;
        }
        return null;
    }
    getConstantWithOperation(node) {
        if (this.isSingle(node)) return null;

        if (this.isSingle(node.args[0]) && !this.isSingle(node.args[1]) ||
            this.isSingle(node.args[1]) && !this.isSingle(node.args[0])) {

            if (this.isSingle(node.args[0])) {
                return {
                    variable: node.args[0],
                    operation: node.args[1],
                    order: 0,
                }
            } else {
                return {
                    variable: node.args[1],
                    operation: node.args[0],
                    order: 1
                }
            }
        }

        return null;
    }
    getOperationWithOperation(node) {
        if (this.isSingle(node)) return null;
        if (!this.isSingle(node.args[0]) && !this.isSingle(node.args[1])) {
            return node.args;
        }
        return null;
    }
    addScoreboardByVariable(node) {
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
    isFn(node) {
        return node.op == '^' || typeof node.fn === 'object';
    }
    quotedBySymbol = {
        '#': '$hash$',
        '.': '$dot$',
        ',': '$comma$',
        '=': '$equal$',
        '<': '$lessthan$',
        '>': '$greaterthan$',
        '&': '$ampersand$',
        '!': '$not$',
        '@': '$at$',
        // '%':':percent$',
        '~': '$tilde$'
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
    getOperation(node) {
        return form.get('operationLabel').replaceAll('%index%', node.index);
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
    inverseOperationsMap = {
        '/': '*',
        '*': '/'
    }
    scaleOperation(line, node) {
        if (form.get('fractionalPrecision') == 0) return line;
        const inverseOperation = this.inverseOperationsMap[node.op];
        
        if (!inverseOperation) return line;

        const scalar = `%calc% ${this.getOperation(node)} %sb% ${inverseOperation}= #precision %sb%`;

        
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
        form.setError('equation', error);
        console.error(error);
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