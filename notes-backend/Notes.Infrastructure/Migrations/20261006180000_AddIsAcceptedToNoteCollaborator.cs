using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Notes.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddIsAcceptedToNoteCollaborator : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsAccepted",
                table: "NoteCollaborators",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsAccepted",
                table: "NoteCollaborators");
        }
    }
}
