using MediatR;
using Notes.Application.Notes.Common;
using Notes.Application.Interfaces;
using Notes.Domain.Entities;

namespace Notes.Application.Labels.Commands.CreateLabel;

public class CreateLabelCommandHandler : IRequestHandler<CreateLabelCommand, LabelDto>
{
    private readonly IApplicationDbContext _context;
    public CreateLabelCommandHandler(IApplicationDbContext context) => _context = context;

    public async Task<LabelDto> Handle(CreateLabelCommand request, CancellationToken cancellationToken)
    {
        var label = new Label
        {
            Name = request.Name,
            UserId = request.UserId
        };
        _context.Labels.Add(label);
        await _context.SaveChangesAsync(cancellationToken);

        return new LabelDto { Id = label.Id, Name = label.Name };
    }
}
