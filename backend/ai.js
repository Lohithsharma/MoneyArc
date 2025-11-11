function getRecommendations(expenses){
    let total = 0;
    const categoryTotals = {};
    expenses.forEach(e => {
        total += parseFloat(e.amount);
        if(categoryTotals[e.category]) categoryTotals[e.category] += parseFloat(e.amount);
        else categoryTotals[e.category] = parseFloat(e.amount);
    });

    const recs = [];
    for(let cat in categoryTotals){
        if(categoryTotals[cat] > total * 0.3)
            recs.push(`You are spending a lot on ${cat}. Consider reducing it.`);
    }

    if(total > 1000) recs.push("Your total spending is high this month. Try to save more!");

    return recs;
}

module.exports = { getRecommendations };
