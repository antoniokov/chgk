import { measures, measuresMeta } from '../../helpers/measures.js';

const splitMeasure = (measure, sign, row) => {
    const plus = row[measuresMeta[measure].plus];
    return sign === '+' ? plus : row[measure] - plus;
};

const sortMeasureTemplate = (dataProcessed, measure, entity) => (dp1, dp2) => {
    const getMeasure = (player, m) => dataProcessed.filter(r => r[entity] === player)[0][m];
    const plusesDiff = getMeasure(dp2[entity], measuresMeta[measure].plus) - getMeasure(dp1[entity], measuresMeta[measure].plus);
    return plusesDiff || (getMeasure(dp2[entity], measure) - getMeasure(dp1[entity], measure));
};

const getSortedTop = (dataLabeled, dataProcessed, measure, entity, top = null) => {
    const getRow = (name, entity) => dataProcessed.filter(dp => dp[entity] === name)[0];
    const sorted = measuresMeta[measure].cutoff
        ? dataLabeled.filter(dl => measuresMeta[measure].cutoff(getRow(dl[entity], entity)))
        : dataLabeled.slice();

    const sortingFunction = sortMeasureTemplate(dataProcessed, measure, entity);
    sorted.sort(sortingFunction);
    return top ? sorted.slice(0, top*2) : sorted;
};


const visualize = (data, v) => {
    const dataFiltered = v.preFilter ? data.filter(v.preFilter) : data;
    const dataProcessed = v.preProcess ? dataFiltered.map(v.preProcess) : dataFiltered;
    v.measures = measures.filter(m => v.measuresList.includes(m.id));

    const dataTransformed = dataProcessed.reduce((result, row) => {
        ['+', '-'].forEach(r => {
            const obj = { [v.entity]: row[v.entity], 'Результат': r };
            v.measures.forEach(m => obj[m.id] = splitMeasure(m.id, r, row));
            result.push(obj);
        });

        return result;
    }, []);


    const toTooltip = (field) => `${field} `;
    const tooltipFields = [v.entity, ...v.measures.map(m => m.id === measuresMeta[m.id].plus ? m.id : toTooltip(m.id))];
    const dataLabeled = dataTransformed.map(dt => {
        const stats = dataProcessed.filter(dp => dt[v.entity] === dp[v.entity])[0];

        const extraFields = v.measures.reduce((obj, m) => {
            if (m.id === measuresMeta[m.id].plus)
                return obj;

            return Object.assign(obj, { [toTooltip(m.id)]: `${stats[measuresMeta[m.id].plus]}/${stats[m.id]}`})
        }, {});

        return Object.assign({}, dt, extraFields);
    });

    v.dataLabeled = dataLabeled;

    const defaultMeasure = v.measures[0].id;
    const dataReady = getSortedTop(dataLabeled, dataProcessed, defaultMeasure, v.entity, v.top);


    v.config = {
        data: dataReady,
        type: 'horizontal-stacked-bar',
        x: defaultMeasure,
        y: v.entity,
        color: 'Результат',
        guide: {
            color: {
                brewer: {
                    '+': '#24693D',
                    '-': '#9E9E9E'
                }
            },
            showGridLines: ''
        },
        settings: {
            fitModel: 'fit-width'
        },
        plugins: [
            Taucharts.api.plugins.get('tooltip')({ fields: tooltipFields })
        ]
    };


    if (v.calculateAnnotations) {
        v.annotations = v.calculateAnnotations(dataLabeled);
        v.config.plugins.push(Taucharts.api.plugins.get('annotations')({ items: v.annotations }));
    }

    v.chart = new Taucharts.Chart(v.config);
    v.chart.renderTo(`#chart-${v.id}`);

    const select = document.querySelector(`#select-${v.id}`);
    v.measures.forEach((m, i) => {
        const option = document.createElement('option');
        option.value = m.id;
        option.innerHTML = m.label;
        if (i === 0)
            option.selected = true;
        select.appendChild(option);
    });


    select.addEventListener('change', (e) => {
        const measure = e.currentTarget.value;
        v.config.x = measure;
        v.config.data = getSortedTop(v.dataLabeled, dataProcessed, measure, v.entity, v.top);
        v.chart.updateConfig(v.config);
    });

    return v;
};

export default visualize;
