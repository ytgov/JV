import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import helmet from 'helmet';
import * as config from './config';
import { doHealthCheck } from './utils/healthCheck';
import { configureAuthentication } from './routes/auth';
import { CreateMigrationRoutes } from './data';
import { recoveriesRouter, lookupRouter, userRouter, dataRouter, adminRouter, pdfRouter, migrationRouter } from './routes';
import { loadUser } from "./middleware/authz.middleware";
import { emailCronjob } from './services/emailcronjob';
var cron = require('node-cron');
var fileupload = require("express-fileupload");

const app = express();

app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
//app.use(helmet());
app.use(
	helmet.contentSecurityPolicy({
		directives: {
			'default-src': ["'self'"],
			'base-uri': ["'self'"],
			'block-all-mixed-content': [],
			'font-src': ["'self'", 'https:', 'data:'],
			'frame-ancestors': ["'self'"],
			'img-src': ["'self'", 'data:'],
			'object-src': ["'none'"],
			'script-src': ["'self'"],
			'script-src-attr': ["'none'"],
			'style-src': ["'self'", 'https:', "'unsafe-inline'"],
		},
	})
);

// very basic CORS setup
app.use(
	cors({
		origin: config.FRONTEND_URL,
		optionsSuccessStatus: 200,
		credentials: true,
	})
);

configureAuthentication(app);

CreateMigrationRoutes(app);

app.get('/api/healthCheck', (req: Request, res: Response) => {
	doHealthCheck(res);
});

// accepts FormData
app.use(fileupload());

app.use('/api/user', loadUser, userRouter);
app.use('/api/admin', loadUser, adminRouter);
app.use('/api/data', loadUser, dataRouter);
app.use("/api/lookup", loadUser, lookupRouter);
app.use('/api/recoveries', loadUser, recoveriesRouter);
app.use('/api/pdf', loadUser,  pdfRouter);
app.use('/api/migrate', loadUser ,migrationRouter)

// serves the static files generated by the front-end
app.use(express.static(path.join(__dirname, 'web')));

// if no other routes match, just send the front-end
app.use((req: Request, res: Response) => {
	res.sendFile(path.join(__dirname, 'web') + '/index.html');
});


cron.schedule('0 4 * * *', () =>  { //Running at 4:00AM PDT
	emailCronjob()
}, {
	scheduled: true,
	timezone: "America/Vancouver"
});

app.listen(config.API_PORT, () => {
	console.log(`API listenting on port ${config.API_PORT}`);
});
