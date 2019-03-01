using System.Diagnostics;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using SignalProgress.Services;

namespace SignalProgress.Controllers
{
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
}