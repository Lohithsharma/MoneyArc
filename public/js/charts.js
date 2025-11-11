function renderCategoryChart(chartId, summaryData) {
    const ctx = document.getElementById(chartId).getContext('2d');

    const labels = summaryData.map(s => s.category);
    const dataValues = summaryData.map(s => parseFloat(s.total));
    
    // Extended color palette for multiple categories
    const colors = [
        '#FF6384', '#36A2EB', '#FFCE56', 
        '#4BC0C0', '#9966FF', '#FF9F40',
        '#C9CBCF', '#8A2BE2', '#FF4500', '#00CED1'
    ];

    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: dataValues,
                backgroundColor: colors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,               // chart adjusts to container
            maintainAspectRatio: false,     // fit exactly in container
            plugins: {
                legend: {
                    position: 'bottom',     // legend below chart
                    labels: {
                        boxWidth: 20,
                        padding: 10
                    }
                },
                tooltip: {
                    enabled: true,
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.chart._metasets[0].total;
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: $${value.toFixed(2)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}
