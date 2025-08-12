  // 1. Espera a que todo el HTML esté cargado antes de interactuar con el DOM
  document.addEventListener("DOMContentLoaded", loadRecords);

  // 2. Carga y muestra todos los registros en la tabla
  async function loadRecords() {
    try {
      // 2.1 Petición GET a nuestro endpoint para obtener el listado
      const res = await fetch("http://localhost:3000/api/records");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // 2.2 Parseamos la respuesta JSON
      const data = await res.json();

      // 2.3 Seleccionamos el <tbody> y lo limpiamos (eliminamos filas previas)
      const tbody = document.querySelector("#records-table tbody");
      tbody.innerHTML = "";

      // 2.4 Por cada registro, creamos una fila <tr> con sus celdas <td>
      data.forEach(rec => {
        const tr = document.createElement("tr");
        tr.dataset.id = rec.id; // Guardamos el id en data-id de la fila

        // Celdas de datos
        const tdId = document.createElement("td");
        tdId.textContent = rec.id;

        const tdName = document.createElement("td");
        tdName.textContent = rec.name;
        tdName.classList.add("cell-name");

        const tdAge = document.createElement("td");
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

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Eliminar";
        deleteBtn.addEventListener("click", () => deleteRecord(tr));

        tdActions.append(editBtn, deleteBtn);
        tr.append(tdId, tdName, tdAge, tdCity, tdActions);
        tbody.append(tr);
      });
    } catch (err) {
      console.error("Error cargando registros:", err);
      alert("No se pudieron cargar los registros. Revisa la consola.");
    }
  }

  // 3. Transforma una fila en modo edición inline
  function enterEditMode(tr) {
    // 3.1 Obtenemos el id y las celdas de esa fila
    const id = tr.dataset.id;
    const tdName = tr.querySelector(".cell-name");
    const tdAge = tr.querySelector(".cell-age");
    const tdCity = tr.querySelector(".cell-city");
    const tdActions = tr.querySelector(".actions-cell");

    // 3.2 Guardamos los valores originales para poder revertir si cancelan
    const oldName = tdName.textContent;
    const oldAge = tdAge.textContent;
    const oldCity = tdCity.textContent;

    // 3.3 Sustituimos el texto por inputs para editar
    tdName.innerHTML = `<input type="text" value="${oldName}">`;
    tdAge.innerHTML = `<input type="number" value="${oldAge}">`;
    tdCity.innerHTML = `<input type="text" value="${oldCity}">`;

    // 3.4 Creamos el botón Guardar
    const saveBtn = document.createElement("button");
    saveBtn.textContent = "Guardar";
    saveBtn.addEventListener("click", async () => {
      // 3.4.1 Leemos los nuevos valores de los inputs
      const name = tdName.querySelector("input").value.trim();
      const age = +tdAge.querySelector("input").value;
      const city = tdCity.querySelector("input").value.trim();

      try {
        // 3.4.2 Petición PUT para actualizar el registro en el servidor
        const resp = await fetch(`http://localhost:3000/api/records/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, age, city })
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        // 3.4.3 Al actualizar con éxito, recargamos toda la tabla
        await loadRecords();
      } catch (err) {
        console.error("Error al guardar:", err);
        alert("No se pudo actualizar el registro.");
      }
    });

    // 3.5 Creamos el botón Cancelar
    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancelar";
    cancelBtn.addEventListener("click", () => {
      // 3.5.1 Revertimos los textos originales y restauramos botón Editar
      tdName.textContent = oldName;
      tdAge.textContent = oldAge;
      tdCity.textContent = oldCity;
      tdActions.innerHTML = "";
      tdActions.append(createEditButton(tr));
    });

    // 3.6 Sustituimos los botones originales por Guardar y Cancelar
    tdActions.innerHTML = "";
    tdActions.append(saveBtn, cancelBtn);
  };

  // 4. Elimina un registro tras confirmación
  async function deleteRecord(tr) {
    const id = tr.dataset.id;
    // 4.1 Confirmación con ventana nativa
    const confirmMsg = `¿Seguro que quieres eliminar el registro #${id}?`;
    if (!confirm(confirmMsg)) return; // Si el usuario cancela, salimos

    try {
      // 4.2 Petición DELETE al servidor
      const resp = await fetch(`http://localhost:3000/api/records/${id}`, { method: "DELETE" });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      // 4.3 Si el borrado fue exitoso, recargamos la tabla
      await loadRecords();
    } catch (err) {
      console.error("Error al eliminar:", err);
      alert("No se pudo eliminar el registro.");
    }
  }
  
  // 5. Agrega un nuevo registro manualmente desde el formulario
  async function addRecord(event) {
  event.preventDefault();
  // 5.1 Referencias a inputs y caja de mensajes
  const nameInput    = document.getElementById("inputName");
  const ageInput     = document.getElementById("inputAge");
  const cityInput    = document.getElementById("inputCity");
  const messageBox   = document.getElementById("messageBox");

  // Limpia mensajes previos
  messageBox.textContent = "";

  // 5.2 Leemos y validamos valores
  const name = nameInput.value.trim();
  const age  = parseInt(ageInput.value, 10);
  const city = cityInput.value.trim();

  if (!name || !city || !Number.isInteger(age) || age <= 0) {
    messageBox.textContent = "Por favor completa todos los campos correctamente.";
    messageBox.style.color = "red";
    return;
  }

  try {
    // 5.3 Petición POST para crear registro
    const response = await fetch(`http://localhost:3000/api/records`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name, age, city })
    });

    const result = await response.json();

    // 5.4 Si el servidor devuelve error, lo mostramos
    if (!response.ok) {
      // Manejo de error desde el servidor
      messageBox.textContent = result.error || "Hubo un problema al crear el registro.";
      messageBox.style.color = "red";
      return;
    }

    // 5.5 Éxito: feedback, limpiar formulario y recargar tabla
    messageBox.textContent = "Registro agregado con éxito.";
    messageBox.style.color = "green";
    nameInput.value = "";
    ageInput.value  = "";
    cityInput.value = "";
    // Recargar registros para ver el nuevo registro
    await loadRecords();
  } catch (err) {
    console.error("Error de red o servidor:", err);
    messageBox.textContent = "Error en la conexión. Intenta de nuevo más tarde.";
    messageBox.style.color = "red";
  }
}

// 6. Vinculamos el evento submit del formulario a addRecord
document
  .getElementById("formRecord")
  .addEventListener("submit", addRecord);
  
  // 7. Función auxiliar: crea un botón Editar para restaurar la fila
  function createEditButton(tr) {
    const btn = document.createElement("button");
    btn.textContent = "Editar";
    btn.addEventListener("click", () => enterEditMode(tr));
    return btn;
  }
