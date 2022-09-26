up:
	NODE_ENV=production nodemon index.js

start: 
	NODE_ENV=development nodemon index.js

prod_up:
	NODE_ENV=production forever start index.js

prod_down:
	NODE_ENV=production forever stop index.js
