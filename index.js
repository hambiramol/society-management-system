
let members = JSON.parse(localStorage.getItem("members") || "[]");
let expenses = JSON.parse(localStorage.getItem("expenses") || "[]");

function save() {
  localStorage.setItem("members", JSON.stringify(members));
  renderMembers();
}

function loginAdmin() {
  const pass = document.getElementById("adminPass").value;
  if (pass === "admin123") {
    document.getElementById("adminSection").style.display = "block";
    updateMonthlyDue();
    renderMembers();
    renderExpenses();
  } else {
    alert("Invalid password");
  }
}

function addMember() {
  const room = document.getElementById("room").value.trim();
  const name = document.getElementById("name").value.trim();
  const mobile = document.getElementById("mobile").value.trim();
  const email = document.getElementById("email").value.trim();
  const monthly = parseFloat(document.getElementById("monthly").value);

  if (!room || !name || !mobile || !email || isNaN(monthly)) {
    return alert("Please fill in all fields correctly.");
  }

  if (members.find(m => m.room === room)) {
    return alert("Room number already exists.");
  }

  members.push({
    room, name, mobile, email, monthly,
    balance: 0,
    payments: [],
    duesHistory: []
  });

  clearForm();
  save();
  alert("Member added successfully.");
}

function clearForm() {
  document.getElementById("room").value = "";
  document.getElementById("name").value = "";
  document.getElementById("mobile").value = "";
  document.getElementById("email").value = "";
  document.getElementById("monthly").value = "";
}

function renderMembers() {
  const table = document.getElementById("memberTable");
  table.innerHTML = "";

  members.forEach((m, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${m.room}</td>
      <td>${m.name}</td>
      <td>${m.mobile}</td>
      <td>${m.email}</td>
      <td>₹${m.monthly}</td>
      <td>
        <button onclick="deleteMember(${index})">🗑️ Delete</button>
      </td>
    `;
    table.appendChild(row);
  });
}

function deleteMember(index) {
  if (confirm("Are you sure you want to delete this member?")) {
    members.splice(index, 1);
    save();
  }
}

function updateMonthlyDue() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const lastUpdatedMonth = localStorage.getItem("lastDueUpdate");

  if (currentMonth !== lastUpdatedMonth) {
    members.forEach(member => {
      member.balance += member.monthly;
    });
    localStorage.setItem("lastDueUpdate", currentMonth);
    save();
    alert("Monthly dues updated for all members.");
  }
}

function generateDueSheet() {
  if (!confirm("Generate dues for all members?")) return;
  members.forEach(member => {
    member.balance += member.monthly;
  });
  save();
  alert("Due sheet generated.");
}

function exportDueAsExcel() {
  let csv = "Room,Name,Mobile,Email,Monthly Fee,Balance Due\n";
  members.forEach(m => {
    csv += `${m.room},${m.name},${m.mobile},${m.email},${m.monthly},${m.balance}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `DueSheet_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

async function exportDueAsPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("Society Due Sheet", 80, 15);
  doc.setFontSize(10);
  let y = 30;

  doc.text("Room", 10, y);
  doc.text("Name", 30, y);
  doc.text("Mobile", 70, y);
  doc.text("Monthly", 120, y);
  doc.text("Balance", 150, y);
  y += 10;

  members.forEach((m) => {
    doc.text(m.room, 10, y);
    doc.text(m.name, 30, y);
    doc.text(m.mobile, 70, y);
    doc.text(String(m.monthly), 120, y);
    doc.text(String(m.balance), 150, y);
    y += 10;
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
  });

  doc.save(`DueSheet_${new Date().toISOString().slice(0, 10)}.pdf`);
}

function renderExpenses() {
  const list = document.getElementById("expenseList");
  list.innerHTML = expenses.map(e =>
    `<li><strong>${e.date}</strong>: ₹${e.amount} – ${e.description} (Paid to: ${e.paidTo})</li>`
  ).join('') || "<li>No expenses recorded yet</li>";
}

function recordExpense(e) {
  e.preventDefault();

  const newExp = {
    description: document.getElementById("expDesc").value,
    amount: parseFloat(document.getElementById("expAmount").value),
    paidTo: document.getElementById("expPaidTo").value,
    date: document.getElementById("expDate").value
  };

  expenses.push(newExp);
  localStorage.setItem("expenses", JSON.stringify(expenses));
  alert("Expense recorded successfully!");
  e.target.reset();
  renderExpenses();
}

function exportMemberData() {
  const blob = new Blob([JSON.stringify(members, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `SocietyData_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
}

function showTab(id) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.tab-btns button').forEach(btn => btn.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  const buttons = document.querySelectorAll('.tab-btns button');
  const tabIndex = ['memberTab', 'duesTab', 'expenseTab', 'balanceTab', 'backupTab'].indexOf(id);
  if (buttons[tabIndex]) buttons[tabIndex].classList.add('active');
}

function generateBalanceSheet() {
  const selectedMonth = document.getElementById("monthSelect").value; // Format: YYYY-MM
  if (!selectedMonth) return;

  const members = JSON.parse(localStorage.getItem("members") || "[]");
  const expenses = JSON.parse(localStorage.getItem("expenses") || "[]");

  let openingBalance = 0;
  let totalIncome = 0;
  let totalExpenses = 0;
  let paymentsThisMonth = [];
  let expensesThisMonth = [];

  const [selYear, selMonth] = selectedMonth.split('-').map(Number);

  members.forEach(member => {
    (member.payments || []).forEach(p => {
      const [year, month] = parseDateParts(p.date);
      if (year < selYear || (year === selYear && month < selMonth)) {
        openingBalance += parseFloat(p.amount);
      } else if (year === selYear && month === selMonth) {
        totalIncome += parseFloat(p.amount);
        paymentsThisMonth.push({
          room: member.room,
          name: member.name,
          amount: p.amount,
          date: p.date
        });
      }
    });
  });

  expenses.forEach(exp => {
    const [year, month] = parseDateParts(exp.date);
    if (year < selYear || (year === selYear && month < selMonth)) {
      openingBalance -= parseFloat(exp.amount);
    } else if (year === selYear && month === selMonth) {
      totalExpenses += parseFloat(exp.amount);
      expensesThisMonth.push(exp);
    }
  });

  const closingBalance = openingBalance + totalIncome - totalExpenses;

  let html = `
    <div class="card">
      <strong>Month:</strong> ${selectedMonth}<br>
      <strong>Opening Balance:</strong> ₹${openingBalance.toFixed(2)}<br>
      <strong>Total Income (this month):</strong> ₹${totalIncome.toFixed(2)}<br>
      <strong>Total Expenses (this month):</strong> ₹${totalExpenses.toFixed(2)}<br>
      <strong>Closing Balance:</strong> ₹${closingBalance.toFixed(2)} 
      (${closingBalance >= 0 ? "<span style='color:green'>Surplus</span>" : "<span style='color:red'>Deficit</span>"})
    </div>
  `;

  // Show payment breakdown
  html += `<h4>💰 Payments Received</h4><ul>`;
  if (paymentsThisMonth.length === 0) {
    html += `<li>No payments recorded for this month.</li>`;
  } else {
    paymentsThisMonth.forEach(p => {
      html += `<li>${p.room} (${p.name}) paid ₹${p.amount} on ${p.date}</li>`;
    });
  }
  html += `</ul>`;

  // Show expense breakdown
  html += `<h4>🧾 Expenses Made</h4><ul>`;
  if (expensesThisMonth.length === 0) {
    html += `<li>No expenses recorded for this month.</li>`;
  } else {
    expensesThisMonth.forEach(e => {
      html += `<li>₹${e.amount} paid to ${e.paidTo} on ${e.date} (${e.description})</li>`;
    });
  }
  html += `</ul>`;

  document.getElementById("balanceSheetResult").innerHTML = html;
}

// Helper function
function parseDateParts(dateStr) {
  const d = new Date(dateStr);
  return [d.getFullYear(), d.getMonth() + 1]; // month: 0-indexed
}

// function generateDueForMonth() {
//     const selectedMonth = document.getElementById("customMonth").value;
//     if (!selectedMonth) return alert("Select a month.");

//     const key = `dueGenerated_${selectedMonth}`;
//     if (localStorage.getItem(key)) {
//         if (!confirm("Dues already generated for this month. Generate again?")) return;
//     }

//     members.forEach(member => {
//         member.balance += member.monthly;
//     });

//     localStorage.setItem("members", JSON.stringify(members));
//     localStorage.setItem(key, "true");
//     alert(`Dues generated for ${selectedMonth}`);
//     renderMembers();
//     }

// function generateDueForMonth() {
//   const selectedMonth = document.getElementById("customMonth").value;
//   if (!selectedMonth) return alert("Select a month.");

//   if (!confirm(`This will overwrite the dues for ${selectedMonth}. Proceed?`)) return;

//   // Generate dues by adding monthly fee
//   members.forEach(member => {
//     member.balance += member.monthly;
//   });

//   localStorage.setItem("members", JSON.stringify(members));
//   localStorage.setItem(`dueGenerated_${selectedMonth}`, "true"); // Optional: store overwrite time

//   alert(`Dues for ${selectedMonth} have been (re)generated and saved.`);
//   renderMembers();
// }

function generateDueForMonth() {
  const selectedMonth = document.getElementById("customMonth").value;
  if (!selectedMonth) return alert("Select a month.");

  if (!confirm(`This will overwrite dues for ${selectedMonth}. Proceed?`)) return;

  members.forEach(member => {
    // Remove previous due for selected month, if any
    member.duesHistory = member.duesHistory?.filter(d => d.month !== selectedMonth) || [];

    // Add new due
    member.duesHistory.push({ month: selectedMonth, amount: member.monthly });

    // Update balance
    member.balance += member.monthly;
  });

  localStorage.setItem("members", JSON.stringify(members));
  alert(`Dues for ${selectedMonth} have been (re)generated.`);
  renderMembers();
}



    function notifyMembers() {
    members.forEach(member => {
        console.log(`SMS to ${member.mobile}: Your current balance is ₹${member.balance}`);
        console.log(`Email to ${member.email}: Dear ${member.name}, your due is ₹${member.balance}`);
    });

    alert("Simulated SMS and Email notifications sent to console.");
    }

    async function generateDuePDFforMonth() {
    const monthInput = document.getElementById("pdfMonth").value;
    if (!monthInput) return alert("Please select a month.");

    const [year, month] = monthInput.split("-");
    const monthName = new Date(`${monthInput}-01`).toLocaleString("default", { month: "long" });

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text(`Due Sheet - ${monthName} ${year}`, 70, 15);

    doc.setFontSize(10);
    let y = 30;

    doc.text("Room", 10, y);
    doc.text("Name", 30, y);
    doc.text("Mobile", 70, y);
    doc.text("Email", 100, y);
    doc.text("Monthly", 150, y);
    doc.text("Balance", 180, y);
    y += 10;

    members.forEach(member => {
      doc.text(member.room, 10, y);
      doc.text(member.name, 30, y);
      doc.text(member.mobile, 70, y);
      doc.text(member.email, 100, y);
      doc.text(`₹${member.monthly}`, 150, y);
      doc.text(`₹${member.balance}`, 180, y);
      y += 10;

      if (y > 280) {
        doc.addPage();
        y = 20;
      }
    });

    doc.save(`DueSheet_${monthName}_${year}.pdf`);
  }

//   function showMonthlyDues() {
//   const month = document.getElementById("viewMonth").value;
//   const output = document.getElementById("monthlyDuesList");

//   if (!month) return alert("Please select a month.");

//   let html = `<table>
//     <tr><th>Room</th><th>Name</th><th>Monthly Due</th></tr>`;

//   let anyDue = false;

//   members.forEach(m => {
//     const due = m.duesHistory?.find(d => d.month === month);
//     if (due) {
//       anyDue = true;
//       html += `<tr><td>${m.room}</td><td>${m.name}</td><td>₹${due.amount}</td></tr>`;
//     }
//   });

//   html += `</table>`;

//   if (!anyDue) {
//     output.innerHTML = `<p>No dues recorded for ${month}.</p>`;
//   } else {
//     output.innerHTML = html;
//   }
// }

// function showMonthlyDues() {
//   const month = document.getElementById("viewMonth").value;
//   const output = document.getElementById("monthlyDuesList");

//   if (!month) return alert("Please select a month.");

//   let html = `<table>
//     <tr>
//       <th>Room</th>
//       <th>Name</th>
//       <th>Last Balance</th>
//       <th>Monthly Due</th>
//       <th>Total Due</th>
//     </tr>`;

//   let anyDue = false;

//   members.forEach(m => {
//     const due = m.duesHistory?.find(d => d.month === month);
//     if (due) {
//       anyDue = true;
//       const lastBalance = m.balance - due.amount;
//       const totalDue = m.balance;
//       html += `
//         <tr>
//           <td>${m.room}</td>
//           <td>${m.name}</td>
//           <td>₹${lastBalance.toFixed(2)}</td>
//           <td>₹${due.amount.toFixed(2)}</td>
//           <td>₹${totalDue.toFixed(2)}</td>
//         </tr>`;
//     }
//   });

//   html += `</table>`;

//   if (!anyDue) {
//     output.innerHTML = `<p>No dues recorded for ${month}.</p>`;
//   } else {
//     output.innerHTML = html;
//   }
// }

function showMonthlyDues() {
  const month = document.getElementById("viewMonth").value;
  const output = document.getElementById("monthlyDuesList");

  if (!month) {
    alert("Please select a month.");
    return;
  }

  let html = `<table>
    <thead>
      <tr>
        <th>Room</th>
        <th>Name</th>
        <th>Last Balance (Before ${month})</th>
        <th>Monthly Due (${month})</th>
        <th>Total Due</th>
      </tr>
    </thead>
    <tbody>
  `;

  let anyData = false;

  members.forEach(member => {
    // Ensure duesHistory exists
    if (!member.duesHistory) member.duesHistory = [];

    // Find monthly due for selected month
    const currentDue = member.duesHistory.find(d => d.month === month);
    if (currentDue) {
      anyData = true;

      // Calculate last balance (total dues before this month)
      const lastBalance = member.duesHistory
        .filter(d => d.month < month)
        .reduce((sum, d) => sum + d.amount, 0);

      const totalDue = lastBalance + currentDue.amount;

      html += `
        <tr>
          <td>${member.room}</td>
          <td>${member.name}</td>
          <td>₹${lastBalance.toFixed(2)}</td>
          <td>₹${currentDue.amount.toFixed(2)}</td>
          <td>₹${totalDue.toFixed(2)}</td>
        </tr>`;
    }
  });

  html += `</tbody></table>`;

  if (!anyData) {
    output.innerHTML = `<p>No dues found for ${month}.</p>`;
  } else {
    output.innerHTML = html;
  }
}

