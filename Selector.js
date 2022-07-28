class Selector {
    constructor (stdInput, stdOutput) {
        this.stdInput = stdInput;
        this.stdOutput = stdOutput;

        this.arrow = " <<";
        this.options = [];
        this.message = 'HELLO';
        this.index = 0;
    }

    init (options, message) {
        this.index = 0;
        this.options = options;
        this.message = message;
        this.draw(0);
    }

    draw (index) {
        this.erase();
        this.stdOutput.write(this.message);
        const str = this.options.reduce((string, option, idx) => {
            return string += `${option}${idx === index ? this.arrow : ''}\n`;
        }, '')
        this.stdOutput.write(str);
    }

    erase () {
        console.log('\x1Bc');
    }

    down () {
        if (this.index === this.options.length - 1) return;
        this.draw(++this.index);
    }

    up () {
        if (this.index === 0) return;
        this.draw(--this.index);
    }

    select (handler) {
        this.erase();
        this.stdInput.removeListener('keypress', handler);
        const value = this.options[this.index];
        return value;
    }
}

module.exports = {
    Selector   
}