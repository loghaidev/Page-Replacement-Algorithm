window.onload = () => {
    const form = document.querySelector('form');
    form.addEventListener('submit', (e)=> {
        e.preventDefault()
        const formData = new FormData(form);
        const seq = formData.get('seq').split(" ")
        const fsize= formData.get('fsize')

        renderHeader(seq)

        const {fifostr,  fifohit, fifofault, fiforatio} = fifo(seq, +fsize)
        const fifoResult = document.querySelector('#fifo_result table.fifo');
        fifoResult.innerHTML = fifostr;
        document.querySelector('#fifo_result .faults_result').innerHTML = `
            <div class="resultblock" style="text-align: center;" >
                    <p id="hits">Number of Hits: ${fifohit}</p>
                    <p id="misses">Page Faults: ${fifofault}</p>
            </div>
        `
        
        const {lrustr, lrufault, lruhit, lruratio} = lru(seq, +fsize)
        const lruResult = document.querySelector('#lru_result table.lru');
        lruResult.innerHTML = lrustr;

        document.querySelector('#lru_result .faults_result').innerHTML = `
            <div class="resultblock" style="text-align: center;" >
                    <p id="hits">Number of Hits: ${lruhit}</p>
                    <p id="misses">Page Faults: ${lrufault}</p>
            </div>
        `

        const { optstr, optfault, opthit} = optimal(seq, +fsize)
        const optResult = document.querySelector('#opt_result table.opt');
        optResult.innerHTML = optstr;

        document.querySelector('#opt_result .faults_result').innerHTML = `
            <div class="resultblock" style="text-align: center;" >
                    <p id="hits">Number of Hits: ${opthit}</p>
                    <p id="misses">Page Faults: ${optfault}</p>
            </div>
        `

    })
}

function renderHeader(seq) {
    const headerContent = seq.reduce((a, b) => {
        return a + `<td style="padding: 13px; color: #0066cc;">${b}</td>`
    }, '')

    const tableContainers = document.querySelectorAll('#result table.table_header');

    tableContainers.forEach(container => {
        container.innerHTML=`<tr>${headerContent}</tr>`
    })
}

function transpose(l1, num) {
    // Iterate over each element in l1
    for (let i = 0; i < l1.length; i++) {
        // Keep adding '-' to the end of each element until its length reaches num
        while (l1[i].length < num) {
            l1[i].push("-");
        }
    }

    // Use the spread operator (...) along with zip function to transpose the matrix
    const l2 = l1[0].map((col, i) => l1.map(row => row[i]));

    return l2;
}

function optimal(a, m) {
    let page_faults = 0;
    const page = [];
    const FREE = -1;
    const optallList = [];
    const n = a.length
    const countFrame = []

    // Initialize page with FREE values
    for (let i = 0; i < m; i++) {
        page.push(FREE);
        countFrame.push(FREE)
    }

    for (let i = 0; i < n; i++) {
        let flag = 0;
        for (let j = 0; j < m; j++) {
            if (page[j] == a[i]) {
                flag = 1; //hit
                break;
            }
        }

        if (flag == 0) {
            let faulted = false;
            let new_slot = FREE;
            // Look for an empty slot
            for (let q = 0; q < m; q++) {
                if (page[q] == FREE) { //has empty
                    faulted = true;
                    new_slot = q;
                    page.forEach((_, index) => {
                        countFrame[index]++;
                    })
                    countFrame[q]++;
                    break;
                }
            }

            if (!faulted) {
                // Find next use farthest in future
                let max_future = 0;
                let max_future_q = FREE;
                let infinityList = [];
                for (let q = 0; q < m; q++) {
                    if (page[q] != FREE) {
                        let found = false;
                        for (let ii = i; ii < n; ii++) {
                            if (a[ii] == page[q]) {
                                found = true;
                                if (ii > max_future) {
                                    max_future = ii;
                                    max_future_q = q;
                                }
                                break;
                            }
                        }
                        if (!found) { // 
                            max_future_q = q;
                            infinityList.push(q);
                            // break;
                        }
                    }
                }
                faulted = true;
                new_slot = max_future_q;
                if(infinityList.length > 0) {
                    console.log([countFrame])
                    infinityList.forEach(q => {
                        if(countFrame[new_slot] < countFrame[q]){
                            new_slot = q;
                        }
                        else {
                            countFrame[q]++;
                        }
                    })

                }
            }

            page_faults += 1;
            page[new_slot] = a[i];
        }

        let temp = [...page];
        if(flag===0) {
            countFrame[temp.indexOf(a[i])] = 0
            temp[temp.indexOf(a[i])] = 'red' + a[i];
        }
        else {
            for(let q = 0; q < m; q++) {
                countFrame[q]++;
            }
        }
        // temp.reverse();
        temp = temp.map(n => n === -1 ? '-' : String(n));
        optallList.push(temp);
    }

    optfinalList = transpose(optallList, m);

    optfinalstr = '';
    for (const lists of optfinalList) {
        optfinalstr += '<tr>';
        for (const attr of lists) {
            if (attr.includes('red')) {
                optfinalstr += '<td style="padding: 13px;background-color:#f44336;">' + attr.substring(3) + '</td>';
            } else {
                optfinalstr += '<td style="padding: 13px;">' + attr + '</td>';
            }
        }
        optfinalstr += '</tr>\n';
    }

    optfault = page_faults;
    opthit = n - page_faults;
    optratio = 100.0 * opthit / n;

    return { optstr: optfinalstr, optfault, opthit }
}

function fifo(sequence, frameAmt) {
    let fifoallList = [];
    let frames = [];
    let hit = 0;
    let miss = 0;
    let replaceIndex = 0;
    let temp = [];
    // FIFO algorithm
    sequence.forEach(s => {
        if (frames.includes(s)) {
            hit += 1;
            const index = replaceIndex ===0 ? frameAmt-1 : replaceIndex -1
            if (temp[index].includes('red')) { // removing old "red" value
                temp[index] = temp[index].substring(3);
            }
        } else {
            miss += 1;
            if (frames.length === frameAmt) {
                frames[replaceIndex] = s;
            } else {
                frames.push(s);
            }
            temp = [...frames]; // copying the list by value
            temp[replaceIndex] = 'red' + temp[replaceIndex]; // adding "red" to the new value that is replaced
            replaceIndex = (replaceIndex + 1) % frameAmt;
        }
        fifoallList.push([...temp]);
    });

    fifofinalList = transpose(fifoallList, frameAmt); // transpose for display on the screen

    fifofinalstr = '';
    fifofinalList.forEach(lists => {
        fifofinalstr += '<tr>';
        lists.forEach(attr => {
            if (attr.includes('red')) {
                fifofinalstr += '<td style="padding: 13px;background-color:#f44336;">' + attr.substring(3) + '</td>';
            } else {
                fifofinalstr += '<td style="padding: 13px;">' + attr + '</td>';
            }
        });
        fifofinalstr += '</tr>\n';
    });

    fifofault = miss;
    fifohit = hit;
    fiforatio = (100.0 * hit) / sequence.length;
    return {fifostr: fifofinalstr, fifohit, fifofault, fiforatio}
}

function lru(sequence, frameAmt) {
    let frames = [];
    let lruallList = [];
    let hit = 0;
    let miss = 0;
    let temp = [];
    let currentPage = []

    // LRU algorithm
    sequence.forEach(s => {
        if (!frames.includes(s)) {
            miss += 1;
            if (frames.length === frameAmt) {
                frames.shift();
                frames.push(s);
                temp = [...currentPage];
            } else {
                frames.push(s);
                temp = [...frames];
            }
            if(lruallList.length < frameAmt) {
                temp[temp.length - 1] = 'red' + temp[temp.length - 1];
            }
            temp = (lruallList.length === frameAmt ? currentPage : temp).map(item =>{
                    if(!frames.includes(item)){
                        return 'red' + s;
                    }
                    return item
                })
            currentPage = temp.map(item => item.replace('red',''))
        } else {
            hit += 1;
            frames = frames.filter(frame => frame !== s);
            frames.push(s);
            temp = [...currentPage];
        }
        lruallList.push([...temp]);
    });

    lrufinalList = transpose(lruallList, frameAmt);

    // Adding html tags
    lrufinalstr = '';
    lrufinalList.forEach(lists => {
        lrufinalstr += '<tr>';
        lists.forEach(attr => {
            if (attr.includes('red')) {
                lrufinalstr += '<td style="padding: 13px;background-color:#f44336;">' + attr.substring(3) + '</td>';
            } else {
                lrufinalstr += '<td style="padding: 13px;">' + attr + '</td>';
            }
        });
        lrufinalstr += '</tr>\n';
    });

    lrufault = miss;
    lruhit = hit;
    lruratio = (100.0 * hit) / sequence.length;
    return {lrustr: lrufinalstr, lrufault, lruhit, lruratio}
}


