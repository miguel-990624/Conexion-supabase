// Espera a que el DOM esté listo
document.addEventListener("DOMContentLoaded", loadRecords);

// Función principal para cargar y renderizar registros
async function loadRecords() {
  try {
    const res = await fetch("http://localhost:3000/api/records");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const tbody = document.querySelector("#records-table tbody");
    tbody.innerHTML = "";

    data.forEach(rec => {
      const tr = document.createElement("tr");
      tr.dataset.id = rec.id;

      // Celdas de datos
      const tdId   = document.createElement("td");
      tdId.textContent = rec.id;

      const tdName = document.createElement("td");
      tdName.textContent = rec.name;
      tdName.classList.add("cell-name");

      const tdAge  = document.createElement("td");
      tdAge.textContent = rec.age;
      tdAge.classList.add("cell-age");

      const tdCity = document.createElement("td");
      tdCity.textContent = rec.city;
      tdCity.classList.add("cell-city");

      // Celda de acciones y botón de editar
      const tdActions = document.createElement("td");
      tdActions.classList.add("actions-cell");

      const editBtn = document.createElement("button");
      editBtn.textContent = "Editar";
      editBtn.addEventListener("click", () => enterEditMode(tr));

      tdActions.append(editBtn);
      tr.append(tdId, tdName, tdAge, tdCity, tdActions);
      tbody.append(tr);
    });
  } catch (err) {
    console.error("Error cargando registros:", err);
    alert("No se pudieron cargar los registros. Revisa la consola.");
  }
}

// Convierte una fila en modo edición, con Guardar y Cancelar
function enterEditMode(tr) {
  const id        = tr.dataset.id;
  const tdName    = tr.querySelector(".cell-name");
  const tdAge     = tr.querySelector(".cell-age");
  const tdCity    = tr.querySelector(".cell-city");
  const tdActions = tr.querySelector(".actions-cell");

  // Almacenamos valores actuales
  const oldName = tdName.textContent;
  const oldAge  = tdAge.textContent;
  const oldCity = tdCity.textContent;

  // Sustituimos por inputs
  tdName.innerHTML = `<input type="text" value="${oldName}">`;
  tdAge.innerHTML  = `<input type="number" value="${oldAge}">`;
  tdCity.innerHTML = `<input type="text" value="${oldCity}">`;

  // Botón Guardar
  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Guardar";
  saveBtn.addEventListener("click", async () => {
    const newName = tdName.querySelector("input").value.trim();
    const newAge  = +tdAge.querySelector("input").value;
    const newCity = tdCity.querySelector("input").value.trim();

    try {
      const resp = await fetch(`http://localhost:3000/api/records/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, age: newAge, city: newCity })
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      await loadRecords();
    } catch (err) {
      console.error("Error al guardar:", err);
      alert("No se pudo actualizar el registro.");
    }
  });

  // Botón Cancelar
  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancelar";
  cancelBtn.addEventListener("click", () => {
    // Revertimos solo esta fila
    tdName.textContent   = oldName;
    tdAge.textContent    = oldAge;
    tdCity.textContent   = oldCity;
    tdActions.innerHTML  = "";
    tdActions.append(createEditButton(tr));
  });

  // Reemplazamos los botones en pantalla
  tdActions.innerHTML = "";
  tdActions.append(saveBtn, cancelBtn);
}

// Crea y devuelve un botón Editar con su listener
function createEditButton(tr) {
  const btn = document.createElement("button");
  btn.textContent = "Editar";
  btn.addEventListener("click", () => enterEditMode(tr));
  return btn;
}
