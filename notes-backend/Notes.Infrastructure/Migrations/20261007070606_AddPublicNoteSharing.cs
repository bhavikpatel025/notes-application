using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Notes.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPublicNoteSharing : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsPublic",
                table: "Notes",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "PublicSlug",
                table: "Notes",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PublicViewCount",
                table: "Notes",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_Notes_PublicSlug",
                table: "Notes",
                column: "PublicSlug",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Notes_PublicSlug",
                table: "Notes");

            migrationBuilder.DropColumn(
                name: "IsPublic",
                table: "Notes");

            migrationBuilder.DropColumn(
                name: "PublicSlug",
                table: "Notes");

            migrationBuilder.DropColumn(
                name: "PublicViewCount",
                table: "Notes");
        }
    }
}
