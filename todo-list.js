const todoList = [{
  name: 'review course',
  dueDate: '2025-09-29'
}];

renderTodoList();

function renderTodoList() {
  let todoListHTML = '';

  // Loop over every toDo object and append it to "todoListHTML"
  // Show the objects inside the class "js-todo-list"
  // Loop over evey delete button and add an eventListener that deletes the toDo and rerender the Tasks

  for (let i = 0; i < todoList.length; i++) {
    const todoObject = todoList[i];
    const name = todoObject.name;
    const dueDate = todoObject.dueDate;

    const html = `
      <div>${name}</div>
      <div>${dueDate}</div>
      <button class="js-delete-button delete-todo-button">Delete</button>
    `;

    todoListHTML += html;
  }

  document.querySelector('.js-todo-list')
    .innerHTML = todoListHTML;  



  const deleteButtons = document.querySelectorAll('.js-delete-button');
  
  for (let i = 0; i < deleteButtons.length; i++) {
    const deleteButton = deleteButtons[i];

    deleteButton.addEventListener('click', () => {
      todoList.splice(i, 1);
      renderTodoList();
    });
  } 



}

document.querySelector('.js-add-todo-button')
  .addEventListener('click', () => {
    addTodo();
  });

function addTodo() {
  const inputElement = document.querySelector('.js-name-input');
  const name = inputElement.value;

  const dateInputElement = document.querySelector('.js-due-date-input');
  const dueDate = dateInputElement.value;

  // Add these values to the variable "todoList"
  todoList.push({
    name: name,
    dueDate: dueDate
  }); 

  inputElement.value = '';
  dateInputElement.value = '';

  renderTodoList();
}