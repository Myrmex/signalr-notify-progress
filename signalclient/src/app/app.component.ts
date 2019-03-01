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
