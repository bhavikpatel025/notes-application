using MediatR;
using Microsoft.EntityFrameworkCore;
using Notes.Application.Interfaces;
using Notes.Application.Notes.Common;
using Notes.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace Notes.Application.Notes.Queries.GetNoteHistory
{
    public class GetNoteHistoryQueryHandler : IRequestHandler<GetNoteHistoryQuery, List<NoteHistoryDto>>
    {
        private readonly IApplicationDbContext _context;

        public GetNoteHistoryQueryHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<NoteHistoryDto>> Handle(GetNoteHistoryQuery request, CancellationToken cancellationToken)
        {
            var note = await _context.Notes
                .Include(n => n.TodoItems)
                .Include(n => n.User)
                .FirstOrDefaultAsync(n => n.Id == request.NoteId && n.UserId == request.UserId, cancellationToken);

            if (note == null)
            {
                return new List<NoteHistoryDto>();
            }

            var authorName = !string.IsNullOrWhiteSpace(note.User?.FullName)
                ? note.User.FullName
                : (note.User?.UserName ?? "User");

            var histories = await _context.NoteHistories
                .Where(h => h.NoteId == request.NoteId && h.UserId == request.UserId)
                .OrderByDescending(h => h.CreatedAt)
                .ToListAsync(cancellationToken);

            var result = new List<NoteHistoryDto>();

            foreach (var h in histories)
            {
                List<TodoItemDto> todoItems = new();
                if (!string.IsNullOrEmpty(h.TodoItemsJson))
                {
                    try
                    {
                        todoItems = JsonSerializer.Deserialize<List<TodoItemDto>>(h.TodoItemsJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new();
                    }
                    catch
                    {
                        todoItems = new();
                    }
                }

                result.Add(new NoteHistoryDto
                {
                    Id = h.Id,
                    NoteId = h.NoteId,
                    Title = h.Title,
                    Content = h.Content,
                    Type = (int)h.Type,
                    TodoItems = todoItems,
                    ImageUrls = h.ImageUrls ?? new List<string>(),
                    CreatedAt = h.CreatedAt,
                    AuthorName = authorName
                });
            }

            // Fallback: If no history records exist yet for an older note, create initial record on the fly
            if (!result.Any())
            {
                var currentTodoItems = note.TodoItems.OrderBy(t => t.OrderIndex).Select(t => new TodoItemDto
                {
                    Id = t.Id,
                    Text = t.Text,
                    IsCompleted = t.IsCompleted,
                    OrderIndex = t.OrderIndex
                }).ToList();

                var initialHistory = new NoteHistory
                {
                    Id = Guid.NewGuid(),
                    NoteId = note.Id,
                    UserId = request.UserId,
                    Title = note.Title,
                    Content = note.Content,
                    Type = note.Type,
                    TodoItemsJson = JsonSerializer.Serialize(currentTodoItems),
                    ImageUrls = note.ImageUrls ?? new List<string>(),
                    CreatedAt = note.UpdatedAt
                };

                _context.NoteHistories.Add(initialHistory);
                await _context.SaveChangesAsync(cancellationToken);

                result.Add(new NoteHistoryDto
                {
                    Id = initialHistory.Id,
                    NoteId = initialHistory.NoteId,
                    Title = initialHistory.Title,
                    Content = initialHistory.Content,
                    Type = (int)initialHistory.Type,
                    TodoItems = currentTodoItems,
                    ImageUrls = initialHistory.ImageUrls ?? new List<string>(),
                    CreatedAt = initialHistory.CreatedAt,
                    AuthorName = authorName
                });
            }

            return result;
        }
    }
}
