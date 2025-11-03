from django.db import migrations

class Migration(migrations.Migration):

    dependencies = [
        ("myassets", "0004_alter_asset_options_alter_asset_asset_type_and_more"),
    ]

    operations = [
        migrations.RunSQL(
            # 前向：给现有表补上 note 列（若不存在）
            sql="""
                ALTER TABLE myassets_assetversion
                ADD COLUMN IF NOT EXISTS note varchar(255) NULL;
            """,
            # 回滚：删除 note（一般用不到）
            reverse_sql="""
                ALTER TABLE myassets_assetversion
                DROP COLUMN IF EXISTS note;
            """,
        ),
    ]
