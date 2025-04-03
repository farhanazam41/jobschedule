let jobId = 0;

function addJob() {
    const table = document.getElementById('jobsTable').getElementsByTagName('tbody')[0];
    const row = table.insertRow();
    row.setAttribute('id', 'job-' + jobId);
    row.innerHTML = `
        <td>Job ${jobId + 1}</td>
        <td><input type="number" class="arrival" value="0" min="0"></td>
        <td><input type="number" class="burst" value="1" min="1"></td>
        <td class="start"></td>
        <td class="end"></td>
        <td class="turnaround"></td>
    `;
    jobId++;
}

function removeLastJob() {
    const table = document.getElementById('jobsTable').getElementsByTagName('tbody')[0];
    if (table.rows.length > 0) {
        table.deleteRow(table.rows.length - 1);
        jobId--;
    }
}

function calculateSRTN() {
    const jobs = Array.from(document.getElementById('jobsTable').getElementsByTagName('tbody')[0].rows);
    jobs.sort((a, b) => parseInt(a.cells[1].firstChild.value) - parseInt(b.cells[1].firstChild.value));
    let currentTime = 0;

    jobs.forEach((job, index) => {
        const arrival = parseInt(job.cells[1].firstChild.value);
        const burst = parseInt(job.cells[2].firstChild.value);
        if (currentTime < arrival) {
            currentTime = arrival;
        }
        const start = currentTime;
        const end = start + burst;
        currentTime = end;

        job.cells[3].textContent = start;
        job.cells[4].textContent = end;
        job.cells[5].textContent = end - arrival;
    });

    updateAverageTurnaroundTime(jobs);
    createGanttChart(jobs, 'SRTN');
}

function calculateRoundRobin() {
    const quantum = parseInt(document.getElementById('timeQuantum').value);
    const jobs = Array.from(document.getElementById('jobsTable').getElementsByTagName('tbody')[0].rows);
    const jobQueue = jobs.map((job, index) => ({
        index: index,
        arrival: parseInt(job.cells[1].firstChild.value),
        burst: parseInt(job.cells[2].firstChild.value),
        remaining: parseInt(job.cells[2].firstChild.value),
        start: [],
        end: null
    })).sort((a, b) => a.arrival - b.arrival);

    let currentTime = 0;
    let activeJobs = [];

    while (jobQueue.some(job => job.remaining > 0)) {
        // Add jobs to active queue if they have arrived
        jobQueue.forEach(job => {
            if (job.arrival <= currentTime && job.remaining > 0 && !activeJobs.includes(job)) {
                activeJobs.push(job);
            }
        });

        if (activeJobs.length > 0) {
            const currentJob = activeJobs.shift();
            const workTime = Math.min(currentJob.remaining, quantum);
            if (currentJob.start.length === 0 || (currentJob.start.length > 0 && currentJob.end !== currentTime)) {
                currentJob.start.push(currentTime);
            }
            currentJob.remaining -= workTime;
            currentTime += workTime;
            currentJob.end = currentTime;

            if (currentJob.remaining > 0) {
                activeJobs.push(currentJob);  // Re-add job to queue if remaining time left
            }
        } else {
            currentTime++;  // Increment time if no active jobs
        }
    }

    // Update HTML table
    jobQueue.forEach(job => {
        const jobRow = jobs[job.index];
        const firstStart = job.start[0];
        const lastEnd = job.end;
        jobRow.cells[3].textContent = firstStart;
        jobRow.cells[4].textContent = lastEnd;
        jobRow.cells[5].textContent = lastEnd - job.arrival;
    });

    updateAverageTurnaroundTime(jobs);
    createGanttChart(jobs, 'Round Robin');
}

function updateAverageTurnaroundTime(jobs) {
    const turnaroundTimes = jobs.map(job => parseInt(job.cells[5].textContent));
    const total = turnaroundTimes.reduce((a, b) => a + b, 0);
    const average = total / turnaroundTimes.length;
    document.getElementById('averageTurnaround').textContent = `Average Turnaround Time: (${turnaroundTimes.join(' + ')}) / ${turnaroundTimes.length} = ${average.toFixed(2)}`;
}

function createGanttChart(jobs, method) {
    const chartsContainer = document.getElementById('chartsContainer');
    const chartContainer = document.createElement('div');
    const chartCanvas = document.createElement('canvas');

    // Set an ID or class for styling if needed
    chartContainer.className = 'chart-container';
    chartContainer.appendChild(chartCanvas);
    chartsContainer.appendChild(chartContainer);

    const ctx = chartCanvas.getContext('2d');
    const labels = jobs.map((job, index) => `Job ${index + 1}`);

    // Colors array as previously defined
    const colors = ['rgba(54, 162, 235, 0.5)', 'rgba(75, 192, 192, 0.5)', 'rgba(255, 99, 132, 0.5)', 'rgba(255, 206, 86, 0.5)', 'rgba(153, 102, 255, 0.5)', 'rgba(255, 159, 64, 0.5)'];

    const chartData = jobs.map((job, index) => {
        const start = parseInt(job.getElementsByClassName('start')[0].textContent) || 0;
        const end = parseInt(job.getElementsByClassName('end')[0].textContent) || 0;
        const duration = end - start;
        return {
            x: start,
            y: duration
        };
    });

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: `${method} Job Durations`,
                data: chartData.map(item => item.y),
                backgroundColor: jobs.map((job, index) => colors[index % colors.length]),
                borderColor: jobs.map((job, index) => colors[index % colors.length]),
                borderWidth: 1,
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Time (units)'
                    }
                },
                y: {
                    ticks: {
                        stepSize: 1,
                        autoSkip: false  // Ensures all labels are shown
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.chart.data.labels[context.dataIndex];
                            const dataset = context.dataset;
                            const value = dataset.data[context.dataIndex];
                            const start = chartData[context.dataIndex].x;
                            const end = start + value;
                            return `${label}: Start at ${start}, End at ${end}, Duration: ${value}`;
                        }
                    }
                }
            }
        }
    });
}
