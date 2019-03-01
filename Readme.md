# SignalR + Angular

Sample code for SignalR + Angular 7 to notify progress of long operations in the web API.

Start point for the server side was https://msdn.microsoft.com/en-us/magazine/mt846469.aspx, plus the docs at https://docs.microsoft.com/en-us/aspnet/core/signalr/hubs?view=aspnetcore-2.2.

This repository comes from my repro solution originally posted at <https://stackoverflow.com/questions/54927044/signalr-notifying-progress-of-lengthy-operation-from-asp-net-core-web-api-to-an>.

## Server Side

1.create a new ASP.NET core web API app. No authentication or Docker, just to keep it minimal.

2.add the NuGet package `Microsoft.AspNetCore.SignalR`.

3.at `Startup.cs`, `ConfigureServices`:

```cs
public void ConfigureServices(IServiceCollection services)
{
    // CORS (before MVC)
    services.AddCors(o => o.AddPolicy("CorsPolicy", builder =>
    {
        builder.AllowAnyMethod()
            .AllowAnyHeader()
            // https://github.com/aspnet/SignalR/issues/2110 for AllowCredentials
            .AllowCredentials()
            .WithOrigins("http://localhost:4200");
    }));
    // SignalR
    services.AddSignalR();

    services.AddMvc().SetCompatibilityVersion(CompatibilityVersion.Version_2_2);
}
```

and the corresponding `Configure` method:

```cs
public void Configure(IApplicationBuilder app, IHostingEnvironment env)
{
    if (env.IsDevelopment())
    {
        app.UseDeveloperExceptionPage();
    }
    else
    {
        // The default HSTS value is 30 days.
        // You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
        app.UseHsts();
    }

    // CORS (before MVC)
    app.UseCors("CorsPolicy");
    // SignalR: add to the API at route "/progress"
    app.UseSignalR(routes =>
    {
        routes.MapHub<ProgressHub>("/progress");
    });

    app.UseHttpsRedirection();
    app.UseMvc();
}
```

4.add a `ProgressHub` class, which automatically adds the current user ID to the `progress` group when connected:

```cs
public sealed class ProgressHub : Hub
{
    public const string GROUP_NAME = "progress";

    public override Task OnConnectedAsync()
    {
        // https://github.com/aspnet/SignalR/issues/2200
        // https://docs.microsoft.com/en-us/aspnet/signalr/overview/guide-to-the-api/working-with-groups
        return Groups.AddToGroupAsync(Context.ConnectionId, "progress");
    }
}
```

5.add a `TaskController` with a method to start some lengthy operation:

```cs
[Route("api/task")]
[ApiController]
public class TaskController : ControllerBase
{
    private readonly IHubContext<ProgressHub> _progressHubContext;

    public TaskController(IHubContext<ProgressHub> progressHubContext)
    {
        _progressHubContext = progressHubContext;
    }

    [HttpGet("lengthy")]
    public async Task<IActionResult> Lengthy()
    {
        await _progressHubContext
            .Clients
            .Group(ProgressHub.GROUP_NAME)
            .SendAsync("taskStarted");

        for (int i = 0; i < 100; i++)
        {
            Thread.Sleep(200);
            Debug.WriteLine($"progress={i + 1}");
            await _progressHubContext
                .Clients
                .Group(ProgressHub.GROUP_NAME)
                .SendAsync("taskProgressChanged", i + 1);
        }

        await _progressHubContext
            .Clients
            .Group(ProgressHub.GROUP_NAME)
            .SendAsync("taskEnded");

        return Ok();
    }
}
```

## Client Side

1.create a new Angular7 CLI app (without routing, just to keep it simple).

2.`npm install @aspnet/signalr --save`.

3.add a service to call the server's lengthy job:

```ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SettingsService } from './settings.service';
import { ErrorService } from './error.service';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class TaskService {

  constructor(private _http: HttpClient,
    private _settings: SettingsService,
    private _error: ErrorService) { }

  public startJob(): Observable<any> {
    const url = `${this._settings.apiBaseUrl}task/lengthy`;

    return this._http.get<any>(url)
      .pipe(catchError(this._error.handleError));
  }
}
```

Its dependencies: settings service:

```ts
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  public apiBaseUrl: string;

  constructor() {
    if (environment.production) {
      this.apiBaseUrl = 'https://notexisting.azurewebsites.net/api/';
    } else {
      this.apiBaseUrl = 'https://localhost:44348/api/';
    }
  }
}
```

and error service:

```ts
import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { throwError } from 'rxjs';

// https://angular.io/guide/http

/**
 * Error handler for services. To use this in your service, pipe a catchError
 * operator with its argument equal to the handleError method of this service.
 * Note: pipe this method after retry, if using it.
 */
@Injectable({
  providedIn: 'root'
})
export class ErrorService {

  /**
   * Handle the specified error response.
   * @param error The error response.
   */
  public handleError(error: HttpErrorResponse) {
    if (error.error instanceof ErrorEvent) {
      // A client-side or network error occurred. Handle it accordingly.
      console.error('A client-side or network error occurred: ', error.error.message);
    } else {
      // The backend returned an unsuccessful response code.
      // The response body may contain clues as to what went wrong,
      console.error(
        `Backend returned code ${error.status}, ` +
        `body was: ${error.error}`);
    }
    // return an observable with a user-facing error message
    return throwError(
      'Something bad happened; please try again later.');
  }
}
```

4.my `app.component` code (of course in real world you would rather inject the URL; anyway, note the `https` protocol here):

```ts
import { Component, OnInit } from '@angular/core';
import { HubConnectionBuilder, HubConnection, LogLevel } from '@aspnet/signalr';
import { TaskService } from './services/task.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  private _connection: HubConnection;

  public messages: string[];

  constructor(private _taskService: TaskService) {
    this.messages = [];
  }

  ngOnInit(): void {
    // https://codingblast.com/asp-net-core-signalr-chat-angular/
    this._connection = new HubConnectionBuilder()
      .configureLogging(LogLevel.Debug)
      .withUrl('https://localhost:44348/progress')
      .build();

    this._connection.on('taskStarted', data => {
      console.log('task started');
    });
    this._connection.on('taskProgressChanged', data => {
      console.log(data);
      this.messages.push(data);
    });
    this._connection.on('taskEnded', data => {
      console.log('task ended');
    });

    this._connection
      .start()
      .then(() => console.log('Connection started!'))
      .catch(err => console.error('Error while establishing connection: ' + err));
  }

  public startJob() {
    this.messages = [];
    this._taskService.startJob().subscribe(
      () => {
        console.log('Task service succeeded');
      },
      error => {
        console.error(error);
      }
    );
  }
}
```

Its minimalist HTML template:

```html
<h2>Test</h2>
<button type="button" (click)="startJob()">start</button>
<div>
  <p *ngFor="let m of messages">{{m}}</p>
</div>
```

Note: to inspect the network traffic, in Chrome developer you can click the Network / WS tab.
