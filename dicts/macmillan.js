/* global api */
class enen_Collins {
    constructor(options) {
        this.options = options;
        this.maxexample = 2;
        this.word = '';
    }

    async displayName() {
        let locale = await api.locale();
        if (locale.indexOf('CN') != -1) return '柯林斯英英词典';
        if (locale.indexOf('TW') != -1) return '柯林斯英英词典';
        return 'Macmillan English Dictionary';
    }


    setOptions(options) {
        this.options = options;
        this.maxexample = options.maxexample;
    }

    async findTerm(word) {
        this.word = word;
        //let deflection = api.deinflect(word);
        let results = await Promise.all([this.findMacmillan(word)]);
        return [].concat(...results).filter(x => x);
    }

    async findMacmillan(word) {
        let notes = [];
        if (!word) return notes; // return empty notes

        function T(node) {
            if (!node)
                return '';
            else
                return node.innerText.trim();
        }

        let base = 'https://www.macmillandictionary.com/us/dictionary/american/';
        let url = base + encodeURIComponent(word);
        let doc = '';
        try {
            let data = await api.fetch(url);
            let parser = new DOMParser();
            doc = parser.parseFromString(data, 'text/html');
        } catch (err) {
            return [];
        }

        let dictionary = doc.querySelector('.left-content');
        if (!dictionary) return notes; // return empty notes

        let expression = T(dictionary.querySelector('h1.BASE'));
        let reading = T(dictionary.querySelector('.PRON'));

        let band = dictionary.querySelector('.SENSE-NUM');
        let bandnum = band ? band.dataset.band : '';
        let extrainfo = bandnum ? `<span class="band">${'\u25CF'.repeat(Number(bandnum))}</span>` : '';

        let sound = dictionary.querySelector('span.sound');
        let audios = sound ? [sound.dataset.srcMp3] : [];
        // make definition segement
        let definitions = [];
        let defblocks = dictionary.querySelectorAll('.no-grow') || [];
        for (const defblock of defblocks) {
            let pos = T(defblock.querySelector('.SENSE-NUM'));
            pos = pos ? `<span class="pos">${pos}</span>` : '';
            let eng_tran = T(defblock.querySelector('.DEFINITION'));
            if (!eng_tran) continue;
            let definition = '';
            eng_tran = eng_tran.replace(RegExp(expression, 'gi'), '<b>$&</b>');
            eng_tran = `<span class='eng_tran'>${eng_tran}</span>`;
            let tran = `<span class='tran'>${eng_tran}</span>`;
            definition += `${pos}${tran}`;

            // make exmaple segement
            let examps = defblock.querySelectorAll('.EXAMPLE') || '';
            if (examps.length > 0 && this.maxexample > 0) {
                definition += '<ul class="sents">';
                for (const [index, examp] of examps.entries()) {
                    if (index > this.maxexample - 1) break; // to control only 2 example sentence.
                    let eng_examp = T(examp) ? T(examp).replace(RegExp(expression, 'gi'), '<b>$&</b>') : '';
                    definition += eng_examp ? `<li class='sent'><span class='eng_sent'>${eng_examp}</span></li>` : '';
                }
                definition += '</ul>';
            }
            definition && definitions.push(definition);
        }
        let css = this.renderCSS();
        notes.push({
            css,
            expression,
            reading,
            extrainfo,
            definitions,
            audios,
        });
        return notes;
    }

    renderCSS() {
        let css = `
            <style>
                span.band {color:#e52920;}
                span.pos  {text-transform:lowercase; font-size:0.9em; margin-right:5px; padding:2px 4px; color:white; background-color:#0d47a1; border-radius:3px;}
                span.tran {margin:0; padding:0;}
                span.eng_tran {margin-right:3px; padding:0;}
                span.chn_tran {color:#0d47a1;}
                ul.sents {font-size:0.8em; list-style:square inside; margin:3px 0;padding:5px;background:rgba(13,71,161,0.1); border-radius:5px;}
                li.sent  {margin:0; padding:0;}
                span.eng_sent {margin-right:5px;}
                span.chn_sent {color:#0d47a1;}
            </style>`;
        return css;
    }
}
